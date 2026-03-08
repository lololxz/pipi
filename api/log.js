export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    return res.status(500).json({
      error: "Webhook não configurado"
    });
  }

  try {

    const discord = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    if (!discord.ok) {
      return res.status(500).json({
        error: "Erro ao enviar para Discord"
      });
    }

    return res.status(200).json({
      success: true
    });

  } catch (err) {

    return res.status(500).json({
      error: "Falha interna",
      details: err.message
    });

  }

}