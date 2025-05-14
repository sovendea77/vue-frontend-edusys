let isMathjaxConfig = false;
const initMathjaxConfig = () => {
  if (!window.MathJax) {
    return;
  }
  window.MathJax = {
    tex: {
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"],
      ], // ⾏内公式选择符
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"],
      ], // 段内公式选择符
    },
    options: {
      skipHtmlTags: [
        "script",
        "noscript",
        "style",
        "textarea",
        "pre",
        "code",
        "a",
      ], // 避开某些标签
      ignoreHtmlClass: "tex2jax_ignore",
      processHtmlClass: "tex2jax_process",
    },
    startup: {
      typeset: false, // 确保在初始化时不自动排版
    },
  };
  isMathjaxConfig = true;
};
const TypeSet = async function (elementId) {
  if (!window.MathJax) {
    return;
  }
  window.MathJax.startup.promise = window.MathJax.startup.promise
    .then(() => {
      return window.MathJax.typesetPromise();
    })
    .catch((err) => console.log("Typeset failed: " + err.message));
  return window.MathJax.startup.promise;
};
export default {
  isMathjaxConfig,
  initMathjaxConfig,
  TypeSet,
};
