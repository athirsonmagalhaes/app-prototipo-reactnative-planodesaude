

# 🏥 HealthConnect

O **HealthConnect** é um protótipo funcional de uma plataforma de saúde digital. Ele permite que usuários se cadastrem, gerenciem seus perfis (incluindo tipo sanguíneo e idade automática), agendem consultas presenciais com médicos de diferentes especialidades e realizem teleconsultas simuladas. Além disso, o app conta com um **Assistente Virtual** integrado à API do Google Gemini.

## 🚀 Funcionalidades Principais

* **Autenticação**: Fluxo completo de Login e Cadastro com validação de data de nascimento e seleção de tipo sanguíneo.
* **Agendamento de Consultas**: Sistema de busca de médicos por Estado, Cidade e Especialidade, com gerenciamento de horários disponíveis.
* **Teleconsulta**: Interface de chamada de vídeo simulada com controles de áudio, vídeo e cronômetro em tempo real.
* **Gestão de Dependentes**: Listagem e adição de familiares ou dependentes.
* **Carteira de Documentos**: Acesso centralizado a receitas, exames e atestados médicos.
* **IA HealthBot**: Chatbot integrado ao Gemini para tirar dúvidas sobre o app e fornecer informações básicas de saúde.
* **Perfil do Usuário**: Exibição detalhada de dados cadastrais e cálculo automático de idade.

## 🛠️ Tecnologias Utilizadas

* **Framework**: [React Native](https://reactnative.dev/)
* **Ícones**: `MaterialIcons` e `Feather` (via `react-native-vector-icons`)
* **Inteligência Artificial**: [Google Generative AI (Gemini API)](https://ai.google.dev/)
* **Linguagem**: JavaScript (ES6+)

---

## 📲 Como Rodar no Expo Snack

O [Expo Snack](https://snack.expo.dev/) é a forma mais rápida de testar o projeto sem precisar configurar um ambiente local.

### Passos para execução:

1. Acesse o site [Expo Snack](https://snack.expo.dev/).
2. No painel esquerdo, localize o arquivo `App.js` e substitua todo o conteúdo original pelo código fornecido no projeto.
3. **Configuração de Dependências**:
* O Snack costuma detectar as dependências automaticamente, mas caso ocorra erro de "Module not found", adicione estas bibliotecas no painel `package.json` ou na aba de dependências do Snack:
* `react-native-vector-icons`
* `@google/genai`




4. **Configuração da API Key (Opcional para o Chat)**:
* No arquivo `App.js`, localize a variável:
```javascript
const GEMINI_API_KEY = 'CHAVE_API_GEMINI_AQUI';

```


* Substitua pelo seu token gerado no [Google AI Studio](https://aistudio.google.com/) para que o Chatbot funcione.


5. **Visualização**:
* No painel direito, escolha entre **iOS**, **Android** ou **Web** para visualizar o app rodando em tempo real.
* *Dica: Para uma experiência melhor, utilize o App "Expo Go" no seu celular real e escaneie o QR Code gerado pelo Snack.*



---

## 📁 Estrutura de Arquivos

* `App.js`: Contém toda a lógica de navegação, estados globais e os componentes de todas as telas (Login, Home, Consultas, etc.).
* **Imagens**: O projeto faz referência a `./src/doutora.jpg` na tela de Teleconsulta. No Snack, você pode substituir o `require` por uma URL de imagem via `uri` para visualização imediata.

## ⚠️ Nota

* **Persistência**: Como este é um protótipo, os dados (usuários cadastrados e consultas) são armazenados em memória (`useState`). Ao recarregar o app, os dados voltam ao estado inicial (Mock).
