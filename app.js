const express = require("express");
require("dotenv").config();
const SHA256 = require("crypto-js/sha256");
const fs = require("fs");
const path = require("path");
const nlp = require("compromise");
const nlpNumbers = require("compromise-numbers");
nlp.plugin(nlpNumbers);

const PORT = process.env.PORT;
const dataFilePath = path.join(__dirname, "data.json");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Stage 1 Task: Build a String Analyzer Service");
});

app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "No sentence parsed" });
  }

  const text = query.toLowerCase();
  const doc = nlp(text);
  const parsed_filters = {};

  // Palindrome detection with negation handling
  if (/\bnot\b.*palindrom/i.test(text) || /\bnon[-\s]?palindrom/i.test(text)) {
    parsed_filters.is_palindrome = false;
  } else if (/\bpalindrom/i.test(text)) {
    parsed_filters.is_palindrome = true;
  }

  // Detect word count
    let wordCountMatch = text.match(/(\b\d+\b|\b[a-z-]+\b)\s+(?:word|words?)/i);
  if (wordCountMatch) {
    const countValue = wordCountMatch[1];
    const numDoc = nlp(countValue);
    const parsedNum = numDoc.values().toNumber().out("text");
    if (parsedNum) {
      parsed_filters.word_count = parseInt(parsedNum);
    } else {
      // descriptive fallback
      if (countValue.includes("single")) parsed_filters.word_count = 1;
      else if (countValue.includes("double")) parsed_filters.word_count = 2;
      else if (countValue.includes("triple")) parsed_filters.word_count = 3;
    }
  } else {
    // direct descriptive fallback (in case no numeric match found)
    if (text.includes("single word")) parsed_filters.word_count = 1;
    else if (text.includes("double word")) parsed_filters.word_count = 2;
    else if (text.includes("triple word")) parsed_filters.word_count = 3;
  }

  // Detect numeric phrases like “minimum length 5” or “maximum length ten”
  const minLength = doc
    .match("minimum length [#Value]")
    .values()
    .numbers()
    .toNumber()
    .out("array")[0];
  const maxLength = doc
    .match("maximum length [#Value]")
    .values()
    .numbers()
    .toNumber()
    .out("array")[0];

  if (minLength) parsed_filters.min_length = minLength;
  if (maxLength) parsed_filters.max_length = maxLength;

  //Detect “contains character a” or “containing a”
  const charMatch = text.match(/contain(?:s|ing)?(?: character)?\s+([a-z])/);
  if (charMatch) parsed_filters.contains_character = charMatch[1];

  //If no valid filters were extracted
  if (Object.keys(parsed_filters).length === 0) {
    return res.status(400).json({
      message: "Could not interpret query",
      interpreted_query: query,
    });
  }

  //Read from file and apply filters
  fs.readFile(dataFilePath, "utf8", (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Error reading file" });
    }

    let dataObj;
    try {
      dataObj = JSON.parse(data || "[]");
    } catch {
      return res.status(500).json({ message: "Invalid JSON format" });
    }

    // filters to data
    let filtered = dataObj;

    if (parsed_filters.is_palindrome !== undefined) {
      filtered = filtered.filter(
        (s) => s.properties.is_palindrome === parsed_filters.is_palindrome
      );
    }

    if (parsed_filters.word_count !== undefined) {
      filtered = filtered.filter(
        (s) => s.properties.word_count === parsed_filters.word_count
      );
    }

    if (parsed_filters.contains_character) {
      filtered = filtered.filter((s) =>
        s.value.toLowerCase().includes(parsed_filters.contains_character)
      );
    }

    if (parsed_filters.min_length) {
      filtered = filtered.filter(
        (s) => s.value.length >= parsed_filters.min_length
      );
    }

    if (parsed_filters.max_length) {
      filtered = filtered.filter(
        (s) => s.value.length <= parsed_filters.max_length
      );
    }

    return res.status(200).json({
      data: filtered,
      count: filtered.length,
      interpreted_query: {
        original: query,
        parsed_filters,
      },
    });
  });
});


app.post("/strings", (req, res) => {
  const { value } = req.body;
  if (!value) {
    return res.status(400).json({
      message: "Invalid request body or missing 'value' field",
    });
  }

  if (typeof value !== "string") {
    return res.status(422).json({
      message: "Invalid data type for 'value' (must be string)",
    });
  }

  fs.readFile(dataFilePath, "utf8", (error, data) => {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "an error occur while reading file" });
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
      return res.status(500).json({ message: "Invalid JSON data in file" });
    }

    const exists = dataObj.some((string) => string.value === value);
    if (exists) {
      return res
        .status(409)
        .json({ message: "String already exists in the system" });
    }

    const palindromeChecker = (string) => {
      let reversed = string.split("").reverse().join("");
      if (string === reversed) {
        return true;
      }
      return false;
    };

    const uniqueChars = (string) => {
      let myset = new Set(string);
      return myset.size;
    };

    function charFreq(string) {
      const map = {};
      for (let i = 0; i < string.length; i++) {
        let count = 0;

        for (let j = 0; j < string.length; j++) {
          if (string[i] == string[j]) {
            count++;
          }
        }
        map[string[i].toLowerCase()] = count;
      }
      return map;
    }

    let hash = SHA256(value).toString();
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
      created_at: new Date().toISOString(),
    };

    dataObj.push(stringObj);
    fs.writeFile(dataFilePath, JSON.stringify(dataObj), (error) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "unable to complete your requst at this time" });
      }

      return res.status(201).json(stringObj);
    });
  });
});

app.get("/strings/:string_value", (req, res) => {
  const string_value = req.params.string_value;

  fs.readFile(dataFilePath, "utf8", (error, data) => {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "an error occur while reading file" });
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
      return res.status(500).json({ message: "Invalid JSON data in file" });
    }

    const string_exists = dataObj.find(
      (string) => string.value === string_value
    );
    if (!string_exists) {
      return res
        .status(404)
        .json({ message: "String does not exist in the system" });
    }

    return res.status(200).json(string_exists);
  });
});

app.get("/strings", (req, res) => {
  const validParams = [
    "is_palindrome",
    "min_length",
    "max_length",
    "word_count",
    "contains_character",
  ];
  const queryKeys = Object.keys(req.query);

  const validQueryCheck = queryKeys.filter((key) => !validParams.includes(key));

  if (validQueryCheck.length > 0) {
    return res
      .status(400)
      .json({ message: "Invalid query parameter values or types" });
  }

  let filters_applied = {};
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  if (
    is_palindrome !== undefined &&
    !["true", "false"].includes(is_palindrome.toLowerCase())
  ) {
    return res.status(400).json({
      message: "Invalid value for is_palindrome. Expected 'true' or 'false'.",
    });
  }

  if (min_length !== undefined && isNaN(parseInt(min_length))) {
    return res.status(400).json({
      message: "Invalid value for min_length. Expected a number.",
    });
  }

  if (max_length !== undefined && isNaN(parseInt(max_length))) {
    return res.status(400).json({
      message: "Invalid value for max_length. Expected a number.",
    });
  }

  if (word_count !== undefined && isNaN(parseInt(word_count))) {
    return res.status(400).json({
      message: "Invalid value for word_count. Expected a number.",
    });
  }

  if (
    contains_character !== undefined &&
    (typeof contains_character !== "string" || contains_character.length !== 1)
  ) {
    return res.status(400).json({
      message:
        "Invalid value for contains_character. Expected a single character (a-z).",
    });
  }

  fs.readFile(dataFilePath, "utf8", (error, data) => {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "an error occur while reading file" });
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
      return res.status(500).json({ message: "Invalid JSON data in file" });
    }

    let filtered = dataObj;
    if (is_palindrome !== undefined) {
      const boolVal = is_palindrome === "true";
      filtered = filtered.filter(
        (string) => string.properties.is_palindrome === boolVal
      );
      filters_applied.is_palindrome = Boolean(is_palindrome);
    }
    // console.log(filtered)
    if (max_length) {
      filtered = filtered.filter(
        (string) => string.properties.length === parseInt(max_length)
      );
      filters_applied.max_length = parseInt(max_length);
    }
    if (min_length) {
      filtered = filtered.filter(
        (string) => string.properties.length === parseInt(min_length)
      );
      filters_applied.min_length = parseInt(min_length);
    }
    if (word_count) {
      filtered = filtered.filter(
        (item) => item.properties.word_count === parseInt(word_count)
      );
      filters_applied.word_count = parseInt(word_count);
    }

    if (contains_character) {
      filtered = filtered.filter((string) =>
        string.properties.character_frequency_map.hasOwnProperty(
          contains_character.toLowerCase()
        )
      );
      filters_applied.contains_character = contains_character;
    }

    return res.status(200).json({
      data: filtered,
      count: filtered.length,
      filters_applied,
    });
  });
});

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});
