const SKALE_API_KEY = process.env.SKALE_API_KEY;
const SKALE_BASE_URL = 'https://api.skalepayments.com.br';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { id } = req.query || {};

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID da transação é obrigatório' });
  }

  try {
    const response = await fetch(`${SKALE_BASE_URL}/transactions/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': SKALE_API_KEY
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(404).json({ success: false, paid: false, status: 'not_found' });
    }

    const isPaid = data.status === 'paid';

    return res.status(200).json({
      success: true,
      id: data.id,
      status: data.status,
      paid: isPaid
    });
  } catch (error) {
    console.error('Erro na rota /api/status:', error);
    return res.status(500).json({ success: false, paid: false, message: 'Erro interno no servidor' });
  }
}
