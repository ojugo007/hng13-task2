const express = require("express");
require("dotenv").config()
const SHA256 = require("crypto-js/sha256");
const fs = require("fs")
const path = require("path")


const PORT = process.env.PORT
const dataFilePath = path.join(__dirname, "data.json")
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// length: Number of characters in the string
// is_palindrome: Boolean indicating if the string reads the same forwards and backwards (case-insensitive)
// unique_characters: Count of distinct characters in the string
// word_count: Number of words separated by whitespace
// sha256_hash: SHA-256 hash of the string for unique identification
// character_frequency_map: Object/dictionary mapping each character to its occurrence count
// The endpoints you’re building

// 1. Create/Analyze String
// POST /strings
// Content-Type: application/json
// Request Body:
// {
//   "value": "string to analyze"
// }
// Success Response (201 Created):
// {
//   "id": "sha256_hash_value",
//   "value": "string to analyze",
//   "properties": {
//     "length": 16,
//     "is_palindrome": false,
//     "unique_characters": 12,
//     "word_count": 3,
//     "sha256_hash": "abc123...",
//     "character_frequency_map": {
//       "s": 2,
//       "t": 3,
//       "r": 2,
//       // ... etc
//     }
//   },
//   "created_at": "2025-08-27T10:00:00Z"
// }
// Error Responses:
// 409 Conflict: String already exists in the system
// 400 Bad Request: Invalid request body or missing "value" field
// 422 Unprocessable Entity: Invalid data type for "value" (must be string)
// 2. Get Specific String
// GET /strings/{string_value}
// Success Response (200 OK):
// {
//   "id": "sha256_hash_value",
//   "value": "requested string",
//   "properties": { /* same as above */ },
//   "created_at": "2025-08-27T10:00:00Z"
// }
// Error Responses:
// 404 Not Found: String does not exist in the system
// 3. Get All Strings with Filtering
// GET /strings?is_palindrome=true&min_length=5&max_length=20&word_count=2&contains_character=a
// Success Response (200 OK):
// {
//   "data": [
//     {
//       "id": "hash1",
//       "value": "string1",
//       "properties": { /* ... */ },
//       "created_at": "2025-08-27T10:00:00Z"
//     },
//     // ... more strings
//   ],
//   "count": 15,
//   "filters_applied": {
//     "is_palindrome": true,
//     "min_length": 5,
//     "max_length": 20,
//     "word_count": 2,
//     "contains_character": "a"
//   }
// }
// Query Parameters:
// is_palindrome: boolean (true/false)
// min_length: integer (minimum string length)
// max_length: integer (maximum string length)
// word_count: integer (exact word count)
// contains_character: string (single character to search for)
// Error Response:
// 400 Bad Request: Invalid query parameter values or types
// 4. Natural Language Filtering
// GET /strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings
// Success Response (200 OK):
// {
//   "data": [ /* array of matching strings */ ],
//   "count": 3,
//   "interpreted_query": {
//     "original": "all single word palindromic strings",
//     "parsed_filters": {
//       "word_count": 1,
//       "is_palindrome": true
//     }
//   }
// }

app.get('/', (req, res) => {
    res.send(SHA256("server is live").toString())
})

app.post('/strings', (req, res) => {
    const { value } = req.body
    if (!value) {
        return res.status(400).json({
            message: "Invalid request body or missing 'value' field"
        })
    }

    if (typeof value !== "string") {
        return res.status(422).json({
            message: "Invalid data type for 'value' (must be string)"
        })
    }

    fs.readFile(dataFilePath, "utf8", (error, data) => {
        if (error) {
            console.log(error)
            res.status(500).json({ message: "an error occur while reading file" })
        }
        let dataObj = [];

        try {
            if (!data || !data.trim()) {
                dataObj = [];
            } else {
                dataObj = JSON.parse(data);
            }
        } catch (parseError) {
            console.error("Invalid JSON format:", parseError);
            return res
                .status(500)
                .json({ message: "Invalid JSON data in file" });
        }

        const exists = dataObj.some((string) => string.value === value)
        if (exists) {
            return res.status(409).json({ message: "String already exists in the system" })
        }

        const palindromeChecker = (string) => {
            let reversed = string.split("").reverse().join('')
            if (string === reversed) {
                return true
            }
            return false
        }

        const uniqueChars = (string) => {
            let myset = new Set(string)
            return myset.size
        }

        function charFreq(string) {
            const map = {}
            for (let i = 0; i < string.length; i++) {
                let count = 0

                for (let j = 0; j < string.length; j++) {
                    if (string[i] == string[j]) {
                        count++
                    }
                }
                map[string[i].toLowerCase()] = count
            }
            return map
        }


        let hash = SHA256(value).toString()
        let stringObj = {
            id: hash,
            value: value,
            properties: {
                length: value.length,
                is_palindrome: palindromeChecker(value),
                unique_characters: uniqueChars(value),
                word_count: value.split(" ").length,
                sha256_hash: hash,
                character_frequency_map: charFreq(value),
            },
            created_at: new Date().toISOString()
        }

        dataObj.push(stringObj)
        fs.writeFile(dataFilePath, JSON.stringify(dataObj), (error) => {
            if (error) {
                return res.status(500).json({ message: "unable to complete your requst at this time" })
            }

            return res.status(201).json(stringObj);

        })
    })
})

app.get("/strings/:string_value", (req, res) => {
    const string_value = req.params.string_value

    fs.readFile(dataFilePath, "utf8", (error, data) => {
        if (error) {
            console.log(error)
            res.status(500).json({ message: "an error occur while reading file" })
        }
        let dataObj = [];

        try {
            if (!data || !data.trim()) {
                dataObj = [];
            } else {
                dataObj = JSON.parse(data);
            }
        } catch (parseError) {
            console.error("Invalid JSON format:", parseError);
            return res
                .status(500)
                .json({ message: "Invalid JSON data in file" });
        }

        const string_exists = dataObj.find((string) => string.value === string_value)
        if (!string_exists) {
            return res.status(404).json({ message: "String does not exist in the system" })
        }


        return res.status(200).json(string_exists)
    })

})

app.get("/strings", (req, res) => {
    let filters_applied = {}
    const { is_palindrome, min_length, max_length, word_count, contains_character } = req.query

    fs.readFile(dataFilePath, "utf8", (error, data) => {
        if (error) {
            console.log(error)
            res.status(500).json({ message: "an error occur while reading file" })
        }
        let dataObj = [];

        try {
            if (!data || !data.trim()) {
                dataObj = [];
            } else {
                dataObj = JSON.parse(data);
            }
        } catch (parseError) {
            console.error("Invalid JSON format:", parseError);
            return res
                .status(500)
                .json({ message: "Invalid JSON data in file" });
        }

        let filtered = dataObj
        if (is_palindrome !== undefined) {
            const boolVal = is_palindrome === "true"
            filtered = filtered.filter((string) => string.properties.is_palindrome === boolVal)
            filters_applied.is_palindrome = Boolean(is_palindrome)

        }
        // console.log(filtered)
        if (max_length) {
            filtered = filtered.filter((string) => string.properties.length === parseInt(max_length))
            filters_applied.max_length = parseInt(max_length)
        }
        if (min_length) {
            filtered = filtered.filter((string) => string.properties.length === parseInt(min_length))
            filters_applied.min_length = parseInt(min_length)
        }
        if(word_count) {
            filtered = filtered.filter((item) => item.properties.word_count === parseInt(word_count));
            filters_applied.word_count = parseInt(word_count)
        }

        if(contains_character){
            filtered = filtered.filter((string)=>string.properties.character_frequency_map.hasOwnProperty(contains_character.toLowerCase()))
            filters_applied.contains_character = contains_character
        }

        return res.status(200).json({
            data : filtered,
            count : filtered.length,
            filters_applied
        })
    })

})

app.listen(PORT, () => {
    console.log(`server is running on ${PORT}`)
})
