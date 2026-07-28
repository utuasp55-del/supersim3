const SKALE_API_KEY = process.env.SKALE_API_KEY;
const SKALE_RECIPIENT_ID = process.env.SKALE_RECIPIENT_ID;
const SKALE_BASE_URL = 'https://api.skalepayments.com.br';

const PIX_PRODUCTS = {
  seguro: { price: 29.63, name: "Seguro Prestamista - SuperSim" },
  up1:  { price: 24.82, name: "IOF - Imposto sobre Operações Financeiras" },
  up2:  { price: 23.91, name: "Taxa de Verificação de IOF" },
  up3:  { price: 18.68, name: "Seguro Prestamista - Tarifa de Cadastro" },
  up4:  { price: 17.20, name: "TENF - Taxa de Emissão da Nota Fiscal" },
  up5:  { price: 17.00, name: "Ativar Conta" },
  up6:  { price: 17.00, name: "Taxa de Registro do Contrato" },
  up7:  { price: 14.06, name: "Taxa - Limite Adicional de R$20.000" },
  up8:  { price: 14.06, name: "Taxa de Processamento" },
  up9:  { price: 11.99, name: "Aplicativo SuperSim" },
  up10: { price: 16.92, name: "TAC - Taxa de Abertura de Crédito" },
  up11: { price: 19.53, name: "Taxa de Consultoria Financeira" },
  up12: { price: 31.92, name: "Taxa de Processamento Administrativo" },

  seguro_ds: { price: 14.82, name: "Seguro Prestamista - SuperSim" },
  up1_ds:  { price: 12.41, name: "IOF - Imposto sobre Operações Financeiras" },
  up2_ds:  { price: 11.96, name: "Taxa de Verificação de IOF" },
  up3_ds:  { price: 9.34,  name: "Seguro Prestamista - Tarifa de Cadastro" },
  up4_ds:  { price: 8.60,  name: "TENF - Taxa de Emissão da Nota Fiscal" },
  up5_ds:  { price: 8.50,  name: "Ativar Conta" },
  up6_ds:  { price: 8.50,  name: "Taxa de Registro do Contrato" },
  up7_ds:  { price: 7.03,  name: "Taxa - Limite Adicional de R$20.000" },
  up8_ds:  { price: 7.03,  name: "Taxa de Processamento" },
  up9_ds:  { price: 6.00,  name: "Aplicativo SuperSim" },
  up10_ds: { price: 8.46,  name: "TAC - Taxa de Abertura de Crédito" },
  up11_ds: { price: 9.77,  name: "Taxa de Consultoria Financeira" },
  up12_ds: { price: 15.96, name: "Taxa de Processamento Administrativo" },
};

function formatPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '(11) 99999-9999';
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { upKey, nome, cpf, email, phone, eid, utms } = body;

    const productKey = upKey || 'seguro';
    const product = PIX_PRODUCTS[productKey] || { price: 29.63, name: "Taxa de Processamento" };
    const amountCents = Math.max(500, Math.round(product.price * 100));

    const cleanCpf = (cpf || '').replace(/\D/g, '') || '00000000000';
    const formattedPhone = formatPhone(phone);
    const customerName = (nome || '').trim() || 'Cliente SuperSim';
    const customerEmail = (email || '').trim() || 'cliente@supersim.com.br';

    const payload = {
      amount: amountCents,
      paymentMethod: 'pix',
      pix: {
        expiresInDays: 1
      },
      customer: {
        name: customerName,
        email: customerEmail,
        phone: formattedPhone,
        document: {
          number: cleanCpf,
          type: 'cpf'
        }
      },
      items: [
        {
          title: product.name,
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
          externalRef: productKey
        }
      ],
      metadata: {
        upKey: productKey,
        eid: eid || '',
        utms: utms || {}
      }
    };

    if (SKALE_RECIPIENT_ID) {
      payload.splits = [
        {
          recipientId: SKALE_RECIPIENT_ID,
          percentage: 100,
          chargeProcessingFee: true
        }
      ];
    }

    const response = await fetch(`${SKALE_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SKALE_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('SkalePayments Error:', data);
      return res.status(400).json({
        success: false,
        message: data.message || 'Erro ao gerar Pix no gateway de pagamento'
      });
    }

    return res.status(200).json({
      success: true,
      txnId: data.id,
      qrcode: data.pix?.qrcode || '',
      amount: product.price
    });
  } catch (error) {
    console.error('Erro na rota /api/pix:', error);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
}
