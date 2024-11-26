import { generateImage } from './api';

// Hamburger menu functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// Image generation functionality
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');

if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const button = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        const image = document.getElementById('image');
        const actionButtons = document.getElementById('actionButtons');
        const logoPrompt = document.getElementById('logoPrompt');
        
        button.disabled = true;
        loading.style.display = 'flex';
        image.style.display = 'none';
        actionButtons.style.display = 'none';

        try {
            const imageData = await generateImage(logoPrompt.value);
            image.src = `data:image/png;base64,${imageData}`;
            image.style.display = 'block';
            actionButtons.style.display = 'flex';
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate interior design');
        } finally {
            button.disabled = false;
            loading.style.display = 'none';
        }
    });
}

if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const image = document.getElementById('image');
        const link = document.createElement('a');
        link.download = 'interior-design.png';
        link.href = image.src;
        link.click();
    });
}