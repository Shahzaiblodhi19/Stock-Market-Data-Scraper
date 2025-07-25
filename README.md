# 📈 Stock-Market-Data-Scraper

A simple Node.js API that scrapes real-time stock data from **Yahoo Finance** (CMP) and **Google Finance** (P/E Ratio & Latest Earnings), calculates portfolio metrics dynamically, and serves JSON data via REST with auto-updates every 15 seconds.

---

## ⚙️ Features

- 💹 Scrapes **Current Market Price (CMP)** from Yahoo Finance  
- 📊 Scrapes **P/E Ratio** & **Latest Earnings** from Google Finance  
- 💰 Calculates **Investment**, **Present Value**, **Gain/Loss**, & **Portfolio %**  
- 🔄 Auto-updates every 15 seconds  
- 📦 Provides structured JSON response

---

## 🛠 Requirements

- Node.js (v14+)  
- Google Chrome installed at:  
  `C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows)  
  *(Update path in code if different)*

---

## 🚀 Installation & Run

```bash
git clone https://github.com/Shahzaiblodhi19/Stock-Market-Data-Scraper.git
cd Stock-Market-Data-Scraper
npm install
node index.js
