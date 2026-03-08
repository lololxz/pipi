export const config = {
    api: { bodyParser: false }
};

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const webhook = process.env.DISCORD_WEBHOOK_URL;

    if (!webhook) {
        return res.status(500).json({ error: "Webhook não configurado" });
    }

    try {

        // Coleta o body bruto (multipart/form-data com foto e vídeo)
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        const contentType = req.headers["content-type"];

        // Encaminha diretamente para a webhook do Discord (com os arquivos anexados)
        const discord = await fetch(webhook, {
            method: "POST",
            headers: {
                "Content-Type": contentType,
                "Content-Length": body.length.toString()
            },
            body
        });

        if (!discord.ok) {
            const details = await discord.text();
            return res.status(500).json({ error: "Erro ao enviar para Discord", details });
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        return res.status(500).json({ error: "Falha interna", details: err.message });
    }

}
