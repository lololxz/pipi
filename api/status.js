export default function handler(req, res) {

  const webhookConfigured = !!process.env.DISCORD_WEBHOOK_URL;

  res.status(200).json({
    status: "online",
    webhook_configured: webhookConfigured
  });

}