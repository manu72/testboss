# GEMINI.md - Best Practices for Customizing Interactions

This file outlines best practices for interacting with Gemini to get the most out of your experience. By following these guidelines, you can customize Gemini's behavior to better suit your needs and achieve more accurate and efficient results.

## 1. Provide Clear and Concise Context

Always start by providing Gemini with sufficient context about your project, the current task, and any relevant background information. This helps Gemini understand the scope and nuances of your request.

**Good Example:**
```
This is a React project. I'm working on the `src/components/Button.jsx` file. I need to add a new `variant` prop to the Button component that accepts "primary", "secondary", or "tertiary" values. The default should be "primary".
```

**Bad Example:**
```
Change the button.
```

## 2. Define Your Goals Explicitly

Clearly state what you want to achieve. Be specific about the desired outcome, including any constraints or requirements.

**Good Example:**
```
My goal is to refactor the `calculatePrice` function in `src/utils/pricing.js` to improve its readability and performance. Ensure that the function still returns the correct price and that all existing tests pass.
```

**Bad Example:**
```
Make the pricing better.
```

## 3. Specify Output Format and Structure

If you have a preferred output format (e.g., code snippet, JSON, Markdown table), specify it in your prompt. This helps Gemini deliver information in a way that's most useful to you.

**Good Example:**
```
Generate a Python code snippet that defines a class `Car` with attributes `make`, `model`, and `year`. Include a constructor and a `display_info` method. The output should be a complete, runnable Python script.
```

**Bad Example:**
```
Write a car class.
```

## 4. Provide Examples When Possible

If you have specific examples of the kind of code, text, or structure you're looking for, include them. This can significantly improve the quality of Gemini's output.

**Good Example:**
```
I need to add a new API endpoint. Here's an example of an existing endpoint in `src/api/users.js`:

```javascript
// Existing endpoint example
app.get('/api/users/:id', (req, res) => {
  // ... logic
});
```

Now, create a new endpoint for `/api/products/:id` that fetches product details from a database.
```

**Bad Example:**
```
Add an endpoint for products.
```

## 5. Iterate and Refine

Don't hesitate to iterate on your prompts. If Gemini's initial response isn't quite right, provide feedback and refine your request. You can ask Gemini to "revise," "modify," or "explain" its previous output.

**Example of Iteration:**

**User:** `Create a simple HTML page with a header and a paragraph.`

**Gemini:** (Provides basic HTML)

**User:** `That's good, but can you also add a CSS style block to center the text and make the header blue?`

## 6. Be Specific with File Operations

When asking Gemini to read, write, or modify files, be precise with file paths and the exact changes you want.

**Good Example:**
```
Read the content of `/src/services/dataService.js`.
```

**Bad Example:**
```
Show me the data service file.
```

## 7. Use Available Tools Effectively

Gemini has access to various tools (e.g., `read_file`, `write_file`, `run_shell_command`, `search_file_content`). Understand what these tools do and how to leverage them in your prompts. For instance, if you need to find a specific piece of code, use `search_file_content` rather than asking Gemini to "find the function that does X" without any file context.

## 8. Security and Safety

Be mindful of security. When asking Gemini to execute shell commands, understand their potential impact. Gemini will explain critical commands before execution, but it's always good to be aware.

By following these best practices, you can significantly enhance your interactions with Gemini and make it a more powerful and efficient assistant for your software engineering tasks.