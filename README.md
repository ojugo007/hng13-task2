# # Stage 1 Task: Build a String Analyzer Service

A simple **Node.js + Express REST API** that performs detailed analysis on strings — including palindrome detection, length, character frequency, SHA-256 hashing, and more.  
All data is stored locally in a `data.json` file using the Node.js `fs` module.  

---

## 🚀 Features  

- ✅ Add a new string and auto-generate analytical properties  
- 🔍 Retrieve all strings or a specific one by value  
- 🔠 Filter strings by query parameters (length, palindrome, etc.)  
- 💬 Filter using natural language (e.g. “palindromic words longer than 5”)  
- 🗑️ Delete a string from the system  
- 💾 Data persistence using local JSON file storage  

---

## 🧩 Tech Stack  

- **Node.js** — JavaScript runtime  
- **Express.js** — Web framework  
- **Crypto-JS** — For SHA-256 hashing  
- **Compromise NLP** + **compromise-numbers** — Natural language parsing  
- **dotenv** — Environment configuration  
- **fs (File System)** — JSON file read/write  

---

## 📂 Project Structure  

```
string-analyzer/
│
├── data.json              # JSON file for data storage
├── .env                   # Environment variables (e.g. PORT)
├── package.json
├── app.js                 # Main server file (your code)
└── README.md              # Project documentation
```

---

## ⚙️ Setup Instructions  

### 1️⃣ Clone the repository  

```bash
git clone https://github.com/ojugo007/hng13-task2.git
cd hng13-task2
```

### 2️⃣ Install dependencies  

```bash
npm install
```

### 3️⃣ Create `.env` file  

```
PORT=3000
```

### 4️⃣ Start the server  

```bash
npm start
```

The app will run at:  
👉 **http://localhost:3000**

---

## 🧠 API Endpoints  

### **Root Route**
**GET /**  
Returns a simple message confirming the server is running.  
**Response:**
```json
"Stage 1 Task: Build a String Analyzer Service"
```

---

### **1️⃣ Create String**
**POST /strings**  
Creates and stores a new string with computed properties.  

**Request Body:**
```json
{
  "value": "racecar"
}
```

**Success (201 Created):**
```json
{
  "id": "hash",
  "value": "racecar",
  "properties": {
    "length": 7,
    "is_palindrome": true,
    "unique_characters": 4,
    "word_count": 1,
    "sha256_hash": "b8e7...",
    "character_frequency_map": {
      "r": 2,
      "a": 2,
      "c": 2,
      "e": 1
    }
  },
  "created_at": "2025-10-20T19:35:00.000Z"
}
```

**Error Responses:**
- 400 — Missing `"value"`  
- 409 — String already exists  
- 422 — Invalid type (not string)

---

### **2️⃣ Retrieve All Strings**
**GET /strings**

Supports filtering by query parameters.

**Query Parameters:**
| Parameter | Type | Description |
|------------|------|-------------|
| is_palindrome | boolean | Filter by palindrome |
| min_length | number | Minimum string length |
| max_length | number | Maximum string length |
| word_count | number | Number of words |
| contains_character | char | Must include specific letter |

**Example:**
```
GET /strings?is_palindrome=true&min_length=5
```

**Response:**
```json
{
  "data": [...],
  "count": 2,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 5
  }
}
```

---

### **3️⃣ Retrieve a Specific String**
**GET /strings/:string_value**

Example:
```
GET /strings/racecar
```

**Response:**
```json
{
  "id": "b8e7...",
  "value": "racecar",
  "properties": { ... },
  "created_at": "..."
}
```

**Errors:**
- 404 — String does not exist  

---

### **4️⃣ Natural Language Filter**
**GET /strings/filter-by-natural-language?query=your_text**

Interprets human-readable queries using NLP.  

**Example Queries:**
```
/strings/filter-by-natural-language?query=palindromic words longer than 5

/strings/filter-by-natural-language?query=strings containing character a

/strings/filter-by-natural-language?query=not palindrome
```

**Response:**
```json
{
  "data": [...],
  "count": 3,
  "interpreted_query": {
    "original": "palindromic words longer than 5",
    "parsed_filters": {
      "is_palindrome": true,
      "min_length": 5
    }
  }
}
```

**Errors:**
- 400 — Unable to interpret or parse  
- 422 — Conflicting filters  

---

### **5️⃣ Delete String**
**DELETE /strings/:string_value**

Deletes a string from storage.

Example:
```
DELETE /strings/racecar
```

**Success (204 No Content):**  
Empty response body  

**Errors:**
- 404 — String not found  
- 400 — Missing parameter  

---

## 📊 Data Storage Example (`data.json`)

```json
[
  {
    "id": "b8e7a...",
    "value": "level",
    "properties": {
      "length": 5,
      "is_palindrome": true,
      "unique_characters": 3,
      "word_count": 1,
      "sha256_hash": "b8e7a...",
      "character_frequency_map": {
        "l": 2,
        "e": 2,
        "v": 1
      }
    },
    "created_at": "2025-10-20T19:35:00.000Z"
  }
]
```

---

## 🧮 Utility Functions Explained

| Function | Purpose |
|-----------|----------|
| `palindromeChecker(string)` | Returns `true` if the string reads the same backward |
| `uniqueChars(string)` | Counts the number of unique characters |
| `charFreq(string)` | Returns a frequency map of all characters |
| `SHA256(string)` | Generates a unique hash identifier |

---

## ⚠️ Error Codes Summary  

| Code | Meaning | Example Trigger |
|------|----------|----------------|
| 200 | OK | Successful retrieval |
| 201 | Created | String successfully added |
| 204 | No Content | String successfully deleted |
| 400 | Bad Request | Missing query or invalid parameter |
| 404 | Not Found | String doesn’t exist |
| 409 | Conflict | Duplicate string |
| 422 | Unprocessable Entity | Conflicting filters or invalid data |
| 500 | Internal Server Error | File read/write error |

---

## 🧑‍💻 Example Test with cURL

**Add string**
```bash
curl -X POST http://localhost:3000/strings -H "Content-Type: application/json" -d '{"value": "madam"}'
```

**Filter palindromes**
```bash
curl http://localhost:3000/strings?is_palindrome=true
```

**Natural language**
```bash
curl "http://localhost:3000/strings/filter-by-natural-language?query=palindromic words shorter than 6"
```

**Delete string**
```bash
curl -X DELETE http://localhost:3000/strings/madam
```

---

## 🧾 License

MIT © 2025 — Built by **Ojugo Silas**  
