const themeBtn = document.getElementById('theme-button');
const body = document.body;
let currentTheme = localStorage.getItem('theme') || 'light-theme';
body.classList.add(currentTheme);
let isLight = currentTheme === 'light-theme'? true : false;

const setThemeBtnIcon = () => {
  if (body.classList.contains('dark-theme')) {
    themeBtn.textContent = '🌙'; 
    isLight = false;
    
    window.dispatchEvent(new CustomEvent("themechange", { detail: { isLight } }));
  } else {
    themeBtn.textContent = '☀️'; 
    isLight = true;
    
    window.dispatchEvent(new CustomEvent("themechange", { detail: { isLight } }));
  }
};

themeBtn.addEventListener('click', () => {
  body.classList.toggle('dark-theme');
  body.classList.toggle('light-theme');
  setThemeBtnIcon();
  localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme');
});


setThemeBtnIcon();

export {isLight};