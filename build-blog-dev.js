import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { marked } from 'marked';
import fsExtra from 'fs-extra';
import { JSDOM } from 'jsdom';

// Create blog directory if it doesn't exist
const blogDir = path.resolve('blog');
fsExtra.ensureDirSync(blogDir);

// Process the CSV file
function processBlogPosts() {
  console.log('Processing development blog posts from CSV...');
  
  // Clean existing blog files
  console.log('Cleaning existing blog files...');
  const existingFiles = fs.readdirSync(blogDir);
  existingFiles.forEach(file => {
    const filePath = path.join(blogDir, file);
    // Don't delete directories, only files
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    }
  });
  
  // Read the dev CSV file
  const csvData = fs.readFileSync('dev-blogposts.csv', 'utf8');
  
  // Parse the CSV
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Create blog listing page content
  let blogListingContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Blog posts about interior design, home decor, and design trends from AI Interior Design Generator.">
    <title>Blog | Free AI Interior Design Generator</title>
    <link rel="stylesheet" href="/src/style.css">
</head>
<body>
    <nav>
        <a href="/" class="nav-logo">AI Interior Design Generator</a>
        <button class="hamburger">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about.html">About Us</a>
            <a href="/blog/index.html">Blog</a>
            <a href="/contact.html">Contact</a>
            <a href="https://roihacks.gumroad.com/coffee" target="_blank" class="coffee-nav-button">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 11h12v3c0 1.657-1.343 3-3 3h-6c-1.657 0-3-1.343-3-3v-3zm14-2h-16v-1c0-1.105 0.895-2 2-2h12c1.105 0 2 0.895 2 2v1zm-3.333-3h-9.334c0-2.761 2.239-5 5-5s5 2.239 5 5z"/>
                </svg>
                Buy us a coffee
            </a>
        </div>
    </nav>

    <main class="container">
        <div class="content-section">
            <h1>Interior Design Blog</h1>
            <p class="subtitle">Explore the latest trends, tips, and inspiration for your home interior design journey.</p>
            
            <div class="blog-posts-grid">
  `;
  
  // Store featured posts for homepage
  let featuredPosts = [];
  
  // Process each blog post
  records.forEach((record, index) => {
    // Clean up title - remove file extension and underscores
    let title = record.title
      .replace(/\.txt$/, '')
      .replace(/_/g, ' ');
    
    let content = record.content || '';
    
    // Skip posts with empty content
    if (!content.trim()) {
      console.log(`Skipping post "${title}" because content is empty`);
      return;
    }
    
    // Extract the title from the first heading
    const titleMatch = content.match(/^#\s+(.+?)(?=\s{2}|\n|$)/m);
    let blogTitle = title;
    
    if (titleMatch && titleMatch[1]) {
      blogTitle = titleMatch[1].trim();
      // Remove the title from the content to avoid duplication
      content = content.replace(/^#\s+(.+?)(?=\s{2}|\n|$)/m, '');
    }
    
    // Process content to properly format headings and images
    
    // Step 1: Process all inline markdown heading syntax (## Heading) to ensure they're on their own lines
    content = content.replace(/(\s+)(#{2,4}\s+[\w\s\-:&',]+)(\s+)/g, "\n\n$2\n\n");
    
    // Step 2: Process image URLs
    content = content.replace(/https:\/\/[^\s]+\.(jpg|jpeg|png|gif)/g, 
      url => `\n\n![Interior design](${url})\n\n`);
    
    // Step 3: Convert markdown to HTML with proper heading support
    marked.use({
      mangle: false,
      headerIds: false
    });
    
    let htmlContent = marked.parse(content);
    
    // Create a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
    
    // Extract the first image URL for the featured image
    let featuredImageUrl = '';
    const imageMatch = content.match(/!\[.*?\]\((https:\/\/[^\s)]+\.(jpg|jpeg|png|gif))\)/);
    if (imageMatch && imageMatch[1]) {
      featuredImageUrl = imageMatch[1];
    }
    
    // Create the blog post HTML file
    const postContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${blogTitle} - Interior design tips and trends from AI Interior Design Generator.">
    <title>${blogTitle} | Free AI Interior Design Generator</title>
    <link rel="stylesheet" href="/src/style.css">
</head>
<body>
    <nav>
        <a href="/" class="nav-logo">AI Interior Design Generator</a>
        <button class="hamburger">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <div class="nav-links">
            <a href="/">Home</a>
            <a href="/about.html">About Us</a>
            <a href="/blog/index.html">Blog</a>
            <a href="/contact.html">Contact</a>
            <a href="https://roihacks.gumroad.com/coffee" target="_blank" class="coffee-nav-button">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 11h12v3c0 1.657-1.343 3-3 3h-6c-1.657 0-3-1.343-3-3v-3zm14-2h-16v-1c0-1.105 0.895-2 2-2h12c1.105 0 2 0.895 2 2v1zm-3.333-3h-9.334c0-2.761 2.239-5 5-5s5 2.239 5 5z"/>
                </svg>
                Buy us a coffee
            </a>
        </div>
    </nav>

    <main class="container">
        <div class="content-section blog-post">
            <a href="/blog/index.html" class="back-to-blog">← Back to Blog</a>
            <article>
                <h1>${blogTitle}</h1>
                <div class="blog-meta">
                    <span class="blog-author">By Jane Vance</span>
                    <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                ${htmlContent}
            </article>
            
            <div class="post-navigation">
                <a href="/blog/index.html" class="back-to-blog-bottom">Back to all posts</a>
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about.html">About Us</a></li>
                    <li><a href="/blog/index.html">Blog</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                    <li><a href="https://roihacks.gumroad.com/coffee">Support Us</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Resources</h4>
                <ul class="footer-links">
                    <li><a href="/#how-to-use">How to Use</a></li>
                    <li><a href="/#best-practices">Best Practices</a></li>
                    <li><a href="/#use-cases">Use Cases</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <ul class="footer-links">
                    <li><a href="/privacy.html">Privacy Policy</a></li>
                    <li><a href="/terms.html">Terms of Service</a></li>
                </ul>
            </div>
        </div>
        <div class="copyright">
            © 2024 Free AI Interior Design Generator. All rights reserved.
        </div>
    </footer>
    <script type="module" src="/src/main.js"></script>
</body>
</html>
    `;
    
    // Extract the first paragraph for the blog excerpt - safely
    const firstParagraphMatch = htmlContent.match(/<p>(.*?)<\/p>/);
    let excerpt = 'Read this blog post about interior design trends and tips...';
    
    if (firstParagraphMatch && firstParagraphMatch[1]) {
      // Use JSDOM to safely handle HTML
      const dom = new JSDOM(`<!DOCTYPE html><div>${firstParagraphMatch[1]}</div>`);
      const text = dom.window.document.querySelector('div').textContent;
      excerpt = text.substring(0, 150) + '...';
    }
    
    // Create a post object for featured posts
    if (index < 2) {
      featuredPosts.push({
        title: blogTitle,
        slug: slug,
        excerpt: excerpt,
        featuredImage: featuredImageUrl
      });
    }
    
    // Add to the blog listing
    blogListingContent += `
      <div class="blog-card">
        ${featuredImageUrl ? `<div class="blog-card-image"><img src="${featuredImageUrl}" alt="${blogTitle}" /></div>` : ''}
        <h2><a href="/blog/${slug}.html">${blogTitle}</a></h2>
        <div class="blog-meta">
          <span class="blog-author">By Jane Vance</span>
          <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="blog-excerpt">${excerpt}</div>
        <a href="/blog/${slug}.html" class="read-more-link">Read More →</a>
      </div>
    `;
    
    // Save the post HTML
    fs.writeFileSync(`${blogDir}/${slug}.html`, postContent);
    console.log(`Created development blog post: ${slug}.html`);
  });
  
  // Complete the blog listing HTML
  blogListingContent += `
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about.html">About Us</a></li>
                    <li><a href="/blog/index.html">Blog</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                    <li><a href="https://roihacks.gumroad.com/coffee">Support Us</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Resources</h4>
                <ul class="footer-links">
                    <li><a href="/#how-to-use">How to Use</a></li>
                    <li><a href="/#best-practices">Best Practices</a></li>
                    <li><a href="/#use-cases">Use Cases</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <ul class="footer-links">
                    <li><a href="/privacy.html">Privacy Policy</a></li>
                    <li><a href="/terms.html">Terms of Service</a></li>
                </ul>
            </div>
        </div>
        <div class="copyright">
            © 2024 Free AI Interior Design Generator. All rights reserved.
        </div>
    </footer>
    <script type="module" src="/src/main.js"></script>
</body>
</html>
  `;
  
  // Save the blog listing page
  fs.writeFileSync(`${blogDir}/index.html`, blogListingContent);
  console.log('Created development blog index page');
  
  // Return featured posts for use in homepage
  return featuredPosts;
}

// Run the blog creation process and get featured posts
const featuredPosts = processBlogPosts();

// Update the homepage with featured posts if any are available
if (featuredPosts.length > 0) {
  try {
    const indexPath = path.resolve('index.html');
    let homeContent = fs.readFileSync(indexPath, 'utf8');
    
    // Create the featured posts section
    const featuredSection = `
    <div class="featured-posts-section">
        <h2>Latest Interior Design Inspirations</h2>
        <p class="subtitle">Check out our latest interior design tips and ideas from our blog</p>
        
        <div class="featured-posts-grid">
            ${featuredPosts.map(post => `
            <div class="featured-post">
                ${post.featuredImage ? `<div class="featured-post-image"><img src="${post.featuredImage}" alt="${post.title}" /></div>` : ''}
                <div class="featured-post-content">
                    <h3><a href="/blog/${post.slug}.html">${post.title}</a></h3>
                    <div class="blog-meta">
                        <span class="blog-author">By Jane Vance</span>
                        <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <p>${post.excerpt}</p>
                    <a href="/blog/${post.slug}.html" class="read-more-link">Read More →</a>
                </div>
            </div>
            `).join('')}
        </div>
        
        <div class="view-all">
            <a href="/blog/index.html" class="secondary-button">View All Blog Posts</a>
        </div>
    </div>`;
    
    // Insert the featured posts section after the generator card
    homeContent = homeContent.replace(
      /<div class="support-section">/,
      `${featuredSection}\n\n<div class="support-section">`
    );
    
    fs.writeFileSync(indexPath, homeContent);
    console.log('Updated homepage with featured posts');
  } catch (error) {
    console.error('Error updating homepage:', error);
  }
}