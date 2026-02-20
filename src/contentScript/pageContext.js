function addLatexToMathJax3() {
    // First check if MathJax exists in the global scope
    if (typeof MathJax === 'undefined') {
        return; // Exit early if MathJax is not available on the page
    }

    // Then check for the specific properties
    if (!MathJax?.startup?.document?.math) {
        return;
    }

    for (const math of MathJax.startup.document.math) {
        math.typesetRoot.setAttribute("marksnip-latex", math.math);
    }
}

// Only call the function if we're in a page context
if (typeof window !== 'undefined') {
    addLatexToMathJax3();
}