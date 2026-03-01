# 🇮🇳 Bharat E-Grievance System (Jan Samadhaan)

A comprehensive web-based grievance management system for citizens to report issues and track their resolution. Features AI-powered complaint analysis, department routing, and real-time status tracking.

## 🌟 Features

- **Citizen Portal**: Submit complaints with photo/video evidence
- **AI-Powered Routing**: Automatic department assignment using Google Gemini
- **Official Dashboard**: Department-wise complaint management
- **Real-time Tracking**: Email notifications and status updates
- **Anonymous Submissions**: Privacy-protected complaint filing
- **Multi-language Support**: Hindi and English interface

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL database (for production)
- Gmail account with App Password (for email notifications)
- Google Gemini API key (free from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/jan-samadhaan.git
   cd jan-samadhaan
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SENDER_EMAIL`: Your Gmail address
   - `SENDER_PASSWORD`: Gmail App Password
   - `GEMINI_API_KEY`: Your Google Gemini API key

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

5. **Access the system**:
   - Citizen Portal: `http://localhost:5000`
   - Official Dashboard: `http://localhost:5000/official.html`

## 📋 Deployment

See [RENDER_SETUP.md](RENDER_SETUP.md) for detailed deployment instructions on Render.

## 🔐 Security

- ⚠️ **Never commit `.env` file to Git**
- Store sensitive credentials in environment variables
- Use Gmail App Passwords (not your main password)
- Regularly rotate API keys

## 🛠️ Technology Stack

- **Backend**: Python, Flask
- **Database**: PostgreSQL (production), SQLite (development)
- **AI**: Google Gemini API
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Render.com

## 📖 Documentation

- [Setup Guide](SETUP_GUIDE.md)
- [Database Configuration](GET_DB_CREDENTIALS.md)
- [Render Deployment](RENDER_SETUP.md)

## 🤝 Contributing

Contributions are welcome! Please ensure you:
1. Never commit sensitive credentials
2. Test thoroughly before submitting
3. Follow existing code style

## 📝 License

This project is open source and available for public use.

## 🙏 Acknowledgments

Built for improving citizen-government communication in India.
