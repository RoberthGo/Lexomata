(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/main/indexPage.js
  var require_indexPage = __commonJS({
    "src/main/indexPage.js"() {
      document.addEventListener("DOMContentLoaded", () => {
        window.redirection = (mode) => {
          window.location.href = `pages/workspace.html?mode=${mode}`;
        };
        window.toggleTheme = () => {
          document.body.classList.toggle("dark");
          document.body.classList.toggle("light");
        };
      });
    }
  });
  require_indexPage();
})();
//# sourceMappingURL=indexPage.js.map
