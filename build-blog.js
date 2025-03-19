import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { marked } from 'marked';
import fsExtra from 'fs-extra';
import { JSDOM } from 'jsdom';

// Create necessary directories
const distDir = path.resolve('dist');
fsExtra.ensureDirSync(distDir);

const blogDir = path.resolve('dist/blog');
fsExtra.ensureDirSync(blogDir);

// Process the CSV file
function processBlogPosts() {
  console.log('Processing blog posts from CSV...');
  
  // Check different locations for the CSV file
  const possiblePaths = [
    'blogposts.csv',
    'public/blogposts.csv',
    path.resolve('public/blogposts.csv')
  ];
  
  let csvFilePath = null;
  let csvData = null;
  
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        csvFilePath = filePath;
        csvData = fs.readFileSync(filePath, 'utf8');
        console.log(`Found CSV file at: ${filePath}`);
        break;
      }
    } catch (error) {
      console.log(`Error checking path ${filePath}: ${error.message}`);
    }
  }
  
  if (!csvData) {
    console.error('Error: blogposts.csv not found in any expected location');
    // Create a sample blog post so the site doesn't break
    return createSampleBlogPost();
  }
  
  // Debug: Print first 200 characters of CSV file
  console.log(`CSV preview: ${csvData.substring(0, 200)}...`);
  
  let records = [];
  
  try {
    // Parse the CSV with very relaxed options
    records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax: true,
      delimiter: ',',
      trim: true
    });
    console.log(`Successfully parsed ${records.length} records from CSV`);
    
    // Debug: Print structure of first record if exists
    if (records.length > 0) {
      console.log('First record structure:');
      const keys = Object.keys(records[0]);
      keys.forEach(key => {
        const value = records[0][key];
        const preview = typeof value === 'string' ? 
          `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` : value;
        console.log(`  ${key}: ${preview} (${typeof value})`);
      });
    }
  } catch (error) {
    console.error(`Error parsing CSV: ${error.message}`);
    return createSampleBlogPost();
  }
  
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
            <a href="/about">About Us</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
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
  let postCount = 0;
  let allSlugs = []; // Store all slug names for debugging and creating specific redirects
  
  // Process each blog post
  for (let i = 0; i < records.length; i++) {
    try {
      const record = records[i];
      
      // Debug
      console.log(`Processing record ${i+1}/${records.length}`);
      
      // Get title and content, handling potential different field names
      let title = '';
      let content = '';
      
      // Try different possible field names for title
      if (record.title) title = record.title;
      else if (record.Title) title = record.Title;
      else if (record.name) title = record.name;
      else if (record.Name) title = record.Name;
      else if (record.Filename) title = record.Filename;
      else {
        // If no title field, use first key that's not content/Content
        const keys = Object.keys(record);
        for (const key of keys) {
          if (key.toLowerCase() !== 'content') {
            title = record[key];
            break;
          }
        }
      }
      
      // Clean up title - remove file extension and underscores if present
      if (title) {
        title = title.replace(/\.txt$/, '').replace(/_/g, ' ');
      }
      
      // Try different possible field names for content
      if (record.content) content = record.content;
      else if (record.Content) content = record.Content;
      else if (record.body) content = record.body;
      else if (record.Body) content = record.Body;
      else if (record.text) content = record.text;
      else {
        // If no content field, use any field that's not title/Title
        const keys = Object.keys(record);
        for (const key of keys) {
          if (key.toLowerCase() !== 'title' && record[key]) {
            content = record[key];
            break;
          }
        }
      }
      
      console.log(`Title: "${title}" (${typeof title})`);
      console.log(`Content preview: "${content?.substring(0, 50)}..." (${typeof content})`);
      
      // Skip posts with empty content
      if (!content || !content.trim()) {
        console.log(`Skipping post "${title}" because content is empty`);
        continue;
      }
      
      // Extract the title from the first heading or use the provided title
      let blogTitle = title || 'Interior Design Blog Post';
      let processedContent = content;
      
      // Try to extract the first heading - safely with error handling
      try {
        const titleMatch = content.match(/^#\s+(.+?)(?=\s{2}|\n|$)/m);
        if (titleMatch && titleMatch[1]) {
          blogTitle = titleMatch[1].trim();
          // Remove the title from the content to avoid duplication
          processedContent = content.replace(/^#\s+(.+?)(?=\s{2}|\n|$)/m, '');
        }
      } catch (error) {
        console.log(`Error extracting title from post "${title}": ${error.message}`);
        // Continue with the provided title
      }
      
      // Debug
      console.log(`Extracted blog title: "${blogTitle}"`);
      
      // Process content to properly format headings and images - with error handling
      try {
        // Step 1: Process all inline markdown heading syntax (## Heading) to ensure they're on their own lines
        processedContent = processedContent.replace(/(\s+)(#{2,4}\s+[\w\s\-:&',]+)(\s+)/g, "\n\n$2\n\n");
        
        // Step 2: Process image URLs
        processedContent = processedContent.replace(/https:\/\/[^\s]+\.(jpg|jpeg|png|gif)/g, 
          url => `\n\n![Interior design](${url})\n\n`);
      } catch (error) {
        console.log(`Error processing content for post "${title}": ${error.message}`);
        // Continue with the original content
        processedContent = content;
      }
      
      // Step 3: Convert markdown to HTML with proper heading support
      let htmlContent = '';
      try {
        marked.use({
          mangle: false,
          headerIds: false
        });
        
        htmlContent = marked.parse(processedContent);
      } catch (error) {
        console.error(`Error parsing markdown for post "${title}": ${error.message}`);
        // Create a simple HTML paragraph from the content to prevent breaking
        htmlContent = `<p>${processedContent}</p>`;
      }
      
      // Create a slug from the title
      const slug = blogTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Add slug to our list for debugging
      allSlugs.push(slug);
      
      // Extract the first image URL for the featured image
      let featuredImageUrl = '';
      try {
        const imageMatch = processedContent.match(/!\[.*?\]\((https:\/\/[^\s)]+\.(jpg|jpeg|png|gif))\)/);
        if (imageMatch && imageMatch[1]) {
          featuredImageUrl = imageMatch[1];
        } else {
          // Try to find direct image URLs if markdown images not found
          const directUrlMatch = processedContent.match(/(https:\/\/[^\s]+\.(jpg|jpeg|png|gif))/);
          if (directUrlMatch && directUrlMatch[1]) {
            featuredImageUrl = directUrlMatch[1];
          }
        }
      } catch (error) {
        console.log(`Error extracting featured image for post "${title}": ${error.message}`);
      }
      
      console.log(`Featured image URL: ${featuredImageUrl || 'None found'}`);
      
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
    <base href="/">
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
            <a href="/about">About Us</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
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
            <a href="/blog" class="back-to-blog">← Back to Blog</a>
            <article>
                <h1>${blogTitle}</h1>
                <div class="blog-meta">
                    <span class="blog-author">By Jane Vance</span>
                    <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                ${htmlContent}
            </article>
            
            <div class="post-navigation">
                <a href="/blog" class="back-to-blog-bottom">Back to all posts</a>
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About Us</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><a href="/contact">Contact</a></li>
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
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/terms">Terms of Service</a></li>
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
      let excerpt = 'Read this blog post about interior design trends and tips...';
      try {
        const firstParagraphMatch = htmlContent.match(/<p>(.*?)<\/p>/);
        if (firstParagraphMatch && firstParagraphMatch[1]) {
          const dom = new JSDOM(`<!DOCTYPE html><div>${firstParagraphMatch[1]}</div>`);
          const text = dom.window.document.querySelector('div').textContent;
          excerpt = text.substring(0, 150) + '...';
        }
      } catch (error) {
        console.error(`Error extracting excerpt for post "${title}":`, error);
      }
      
      // Create a post object for featured posts
      if (postCount < 2) {
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
        <h2><a href="/blog/${slug}">${blogTitle}</a></h2>
        <div class="blog-meta">
          <span class="blog-author">By Jane Vance</span>
          <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="blog-excerpt">${excerpt}</div>
        <a href="/blog/${slug}" class="read-more-link">Read More →</a>
      </div>
      `;
      
      // Save the post HTML
      fs.writeFileSync(`${blogDir}/${slug}.html`, postContent);
      console.log(`Created blog post: ${slug}.html`);
      
      postCount++;
    } catch (error) {
      console.error(`Error processing blog post at index ${i}: ${error.message}`);
    }
  }
  
  // If no posts were created, add a placeholder
  if (postCount === 0) {
    console.warn('No blog posts were created from CSV. Creating a placeholder post.');
    return createSampleBlogPost();
  }
  
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
                    <li><a href="/about">About Us</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><a href="/contact">Contact</a></li>
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
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/terms">Terms of Service</a></li>
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
  console.log('Created blog index page');
  
  // Create a custom redirects file for our blog posts
  try {
    let blogRedirects = "# Blog post specific redirects - auto-generated\n\n";
    allSlugs.forEach(slug => {
      blogRedirects += `/blog/${slug}    /blog/${slug}.html    200\n`;
    });
    fs.writeFileSync(path.resolve('dist/blog-redirects'), blogRedirects);
    console.log('Created blog-specific redirects file');
  } catch (error) {
    console.error('Error creating blog redirects file:', error);
  }
  
  // Copy all blog files to the dist directory if we're running in dev mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      const srcBlogDir = path.resolve('blog');
      if (fs.existsSync(srcBlogDir)) {
        fsExtra.copySync(srcBlogDir, blogDir);
        console.log('Copied development blog files to dist directory');
      }
    } catch (error) {
      console.error('Error copying blog files:', error);
    }
  }
  
  // Return featured posts for use in homepage
  return featuredPosts;
}

// Create a sample blog post to prevent errors
function createSampleBlogPost() {
  const sampleBlogPost = {
    title: "Interior Design Trends for 2025",
    content: `# Interior Design Trends for 2025

The world of interior design is constantly evolving, with new trends emerging each year. As we move into 2025, several exciting trends are taking center stage, transforming how we think about and design our living spaces.

## Sustainable Materials

Sustainability continues to be a major focus in interior design. Homeowners and designers alike are increasingly opting for eco-friendly materials like reclaimed wood, recycled glass, and sustainable fabrics. These materials not only reduce environmental impact but also add character and warmth to spaces.

## Biophilic Design

Connecting with nature through design remains a strong trend in 2025. Biophilic design incorporates natural elements like plants, natural light, and organic materials to create spaces that promote wellbeing and reduce stress. Large windows, indoor gardens, and nature-inspired colors are becoming standard features in modern homes.

## Smart Home Integration

Technology integration is seamlessly blending with aesthetic design. Smart home features are now being built into furniture and fixtures, creating spaces that are both beautiful and functional. From voice-activated lighting to temperature-regulating window treatments, technology is enhancing how we experience our homes.

## Multifunctional Spaces

As remote work continues to be a part of many people's lives, the need for flexible, multifunctional spaces is growing. Designers are creating innovative solutions that allow rooms to serve multiple purposes without sacrificing style or comfort.`
  };

  try {
    // Process the sample post
    const blogTitle = "Interior Design Trends for 2025";
    const slug = "interior-design-trends-for-2025";
    const htmlContent = marked.parse(sampleBlogPost.content);
    
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
    <base href="/">
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
            <a href="/about">About Us</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
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
            <a href="/blog" class="back-to-blog">← Back to Blog</a>
            <article>
                <h1>${blogTitle}</h1>
                <div class="blog-meta">
                    <span class="blog-author">By Jane Vance</span>
                    <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                ${htmlContent}
            </article>
            
            <div class="post-navigation">
                <a href="/blog" class="back-to-blog-bottom">Back to all posts</a>
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About Us</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><a href="/contact">Contact</a></li>
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
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/terms">Terms of Service</a></li>
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
    
    // Create blog listing page
    const blogListingContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Blog posts about interior design, home decor, and design trends from AI Interior Design Generator.">
    <title>Blog | Free AI Interior Design Generator</title>
    <link rel="stylesheet" href="/src/style.css">
    <base href="/">
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
            <a href="/about">About Us</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
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
              <div class="blog-card">
                <h2><a href="/blog/${slug}">${blogTitle}</a></h2>
                <div class="blog-meta">
                  <span class="blog-author">By Jane Vance</span>
                  <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="blog-excerpt">The world of interior design is constantly evolving, with new trends emerging each year. As we move into 2025, several exciting trends are taking center stage, transforming how we...</div>
                <a href="/blog/${slug}" class="read-more-link">Read More →</a>
              </div>
            </div>
        </div>
    </main>

    <footer>
        <div class="footer-content">
            <div class="footer-section">
                <h4>Quick Links</h4>
                <ul class="footer-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About Us</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><a href="/contact">Contact</a></li>
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
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/terms">Terms of Service</a></li>
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
    
    // Save files
    fs.writeFileSync(`${blogDir}/${slug}.html`, postContent);
    fs.writeFileSync(`${blogDir}/index.html`, blogListingContent);
    
    console.log('Created sample blog post');
    
    // Create a specific redirect for this sample post
    try {
      fs.writeFileSync(path.resolve('dist/blog-redirects'), `/blog/${slug}    /blog/${slug}.html    200\n`);
    } catch (error) {
      console.error('Error creating sample blog redirect:', error);
    }
    
    return [{
      title: blogTitle,
      slug: slug,
      excerpt: "The world of interior design is constantly evolving, with new trends emerging each year. As we move into 2025, several exciting trends are taking center stage, transforming how we...",
      featuredImage: ""
    }];
  } catch (error) {
    console.error('Error creating sample blog post:', error);
    return [];
  }
}

// Run the blog creation process and get featured posts
const featuredPosts = processBlogPosts();

// Copy files from /blog to /dist/blog if they exist (development mode)
try {
  const srcBlogDir = path.resolve('blog');
  if (fs.existsSync(srcBlogDir)) {
    const files = fs.readdirSync(srcBlogDir);
    for (const file of files) {
      const srcPath = path.join(srcBlogDir, file);
      const destPath = path.join(blogDir, file);
      
      if (fs.statSync(srcPath).isFile()) {
        console.log(`Copying ${file} from /blog to /dist/blog`);
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
} catch (error) {
  console.error('Error copying files from /blog to /dist/blog:', error);
}

// Update the homepage with featured posts if any are available
if (featuredPosts.length > 0) {
  try {
    const indexHtmlPath = path.resolve('index.html');
    const distIndexHtmlPath = path.resolve('dist/index.html');
    
    let homeContent = '';
    
    // First check if dist/index.html exists
    if (fs.existsSync(distIndexHtmlPath)) {
      homeContent = fs.readFileSync(distIndexHtmlPath, 'utf8');
    } 
    // Otherwise use index.html from root
    else if (fs.existsSync(indexHtmlPath)) {
      homeContent = fs.readFileSync(indexHtmlPath, 'utf8');
    } else {
      console.log('No index.html found to update with featured posts');
      process.exit(0);
    }
    
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
                <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
                <div class="blog-meta">
                    <span class="blog-author">By Jane Vance</span>
                    <span class="blog-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <p>${post.excerpt}</p>
                <a href="/blog/${post.slug}" class="read-more-link">Read More →</a>
            </div>
        </div>
        `).join('')}
    </div>
    
    <div class="view-all">
        <a href="/blog" class="secondary-button">View All Blog Posts</a>
    </div>
</div>`;
    
    // Check if featured section already exists
    if (!homeContent.includes('<div class="featured-posts-section">')) {
      // Insert the featured posts section after the generator card
      homeContent = homeContent.replace(
        /<div class="support-section">/,
        `${featuredSection}\n\n<div class="support-section">`
      );
      
      // Save the updated file
      if (fs.existsSync(distIndexHtmlPath)) {
        fs.writeFileSync(distIndexHtmlPath, homeContent);
      } else {
        // Ensure the dist directory exists
        fsExtra.ensureDirSync(distDir);
        fs.writeFileSync(path.join(distDir, 'index.html'), homeContent);
      }
      console.log('Updated homepage with featured posts');
    }
  } catch (error) {
    console.error('Error updating homepage:', error);
  }
}

// Make sure all required files are in the dist folder
try {
  // Copy static files from root to dist if they don't exist in dist
  const staticFiles = ['about.html', 'contact.html', 'terms.html', 'privacy.html'];
  
  for (const file of staticFiles) {
    const srcPath = path.resolve(file);
    const destPath = path.resolve(path.join(distDir, file));
    
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      console.log(`Copying ${file} to dist folder`);
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  // Make sure _redirects is in the dist folder
  const redirectsPath = path.resolve('public/_redirects');
  const destRedirectsPath = path.resolve(path.join(distDir, '_redirects'));
  
  if (fs.existsSync(redirectsPath)) {
    console.log('Copying _redirects to dist folder');
    fs.copyFileSync(redirectsPath, destRedirectsPath);
  }
} catch (error) {
  console.error('Error copying static files to dist folder:', error);
}