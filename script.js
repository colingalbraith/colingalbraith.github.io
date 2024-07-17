
  function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    menu.classList.toggle("open");
    icon.classList.toggle("open");
  }

  document.addEventListener('DOMContentLoaded', function() {
    const textElement = document.getElementById('animated-text');
    const cursorElement = document.querySelector('.cursor');
    const texts = ['Colin Galbraith', 'Lento', 'A Musician', 'A Data Scientist', 'Game Developer', 'Data Analyst'];
    let textIndex = 0;
    let charIndex = 0;
    let typingSpeed = 100;
    let deletingSpeed = 50;
    let delayBetweenTexts = 2000; // Delay between different texts
    let delayBeforeDeleting = 1000; // Delay before starting to delete the text

    function type() {
      if (charIndex < texts[textIndex].length) {
        textElement.textContent += texts[textIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingSpeed);
      } else {
        setTimeout(deleteText, delayBeforeDeleting);
      }
    }

    function deleteText() {
      if (charIndex > 0) {
        textElement.textContent = texts[textIndex].substring(0, charIndex - 1);
        charIndex--;
        setTimeout(deleteText, deletingSpeed);
      } else {
        textIndex = (textIndex + 1) % texts.length;
        setTimeout(type, delayBetweenTexts);
      }
    }

    type();
  });

  window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    document.getElementById('loading').style.display = 'none'; // Hide loading screen
    handleScroll(); // Check scroll position on load
  });

  window.addEventListener('scroll', handleScroll);

  function handleScroll() {
    document.querySelectorAll('section').forEach(section => {
      if (section.getBoundingClientRect().top < window.innerHeight - 50) { // Adjust to make sections fade in earlier
        section.classList.add('fade-in');
      }
    });
  }





  