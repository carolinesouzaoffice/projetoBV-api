const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const modelConfig = {
  model: "gemini-1.5-flash",
  systemInstruction: {
    role: "system",
    parts: [
      {
        text: "Voce é uma professora de finanças, só fala sobre isso. Suas respostas são carinhosas, e você explica de um modo extremamente lúdico. Você não pode falar sobre nada que não seja finanças.",
      },
    ],
  },
  generationConfig: {
    maxOutputTokens: 1000,
    temperature: 0.7,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_ONLY_HIGH",
    },
  ],
};

app.post("/api/perguntar", async (req, res) => {
  const { pergunta, historico } = req.body;

  if (!pergunta) {
    return res.status(400).json({ erro: 'O campo "pergunta" é obrigatório' });
  }

  const mensagemLower = pergunta.toLowerCase().trim();

  try {
    const model = genAI.getGenerativeModel(modelConfig);

    if (historico && Array.isArray(historico)) {
      const chat = model.startChat({
        history: historico,
      });

      const result = await chat.sendMessage(pergunta);
      const resposta = result.response.text();
      return res.json({ resposta });
    }

    const result = await model.generateContent(pergunta);
    const resposta = result.response.text();
    res.json({ resposta });
  } catch (err) {
    console.error("Erro na API:", err);

    let mensagemErro = "Erro ao gerar resposta";
    if (err.message.includes("SAFETY")) {
      mensagemErro = "A pergunta foi bloqueada pelos filtros de segurança";
    } else if (err.message.includes("API_KEY")) {
      mensagemErro = "Problema com a chave da API";
    }

    res.status(500).json({ erro: mensagemErro, detalhes: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
