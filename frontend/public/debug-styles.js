
// Проверяем что действительно применяется
const checkStyles = () => {
  const h2Elements = document.querySelectorAll("h2");
  h2Elements.forEach(h2 => {
    const computedStyle = window.getComputedStyle(h2);
    console.log("H2 text:", h2.textContent);
    console.log("Computed color:", computedStyle.color);
    console.log("Inline style:", h2.style.cssText);
  });
};

setTimeout(checkStyles, 2000);

