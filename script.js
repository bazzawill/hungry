// Supported image extensions
const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

async function loadImages() {
  const container = document.getElementById('productContainer');
  container.innerHTML = ''; // Clear existing content

  try {
    // Fetch list of files from server
    const response = await fetch('/list-images');
    const images = await response.json();

    images.forEach((image, index) => {
      const productDiv = document.createElement('div');
      productDiv.className = 'product';

      const img = document.createElement('img');
      img.src = image.path;  // Use the full path from server
      img.alt = `Product ${index + 1}`;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'product';
      input.value = image.path;
      input.id = `product-${index}`;

      const label = document.createElement('div');
      label.className = 'product-label';
      // Get filename without extension and replace hyphens/underscores with spaces
      const imageName = image.path.split('/').pop().split('.')[0]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize first letter of each word
      label.textContent = imageName;

      // Make the whole product div clickable
      productDiv.onclick = function() {
        // Deselect all other products
        document.querySelectorAll('.product').forEach(p => p.classList.remove('selected'));
        // Select this product
        productDiv.classList.add('selected');
        // Check the radio button
        input.checked = true;
      };

      productDiv.appendChild(img);
      productDiv.appendChild(input);
      productDiv.appendChild(label);
      container.appendChild(productDiv);
    });
  } catch (error) {
    console.error('Error loading images:', error);
    alert('Error loading images. Please check the console for details.');

  }
}

function showSelection() {
  const selectedProduct = document.querySelector('input[name="product"]:checked');
  if (selectedProduct) {
    const productName = selectedProduct.value.split('/').pop(); // Get filename from path
    alert("You selected: " + productName);
  } else {
    alert("Please select a product by clicking on an image.");
  }
}

// Load images from root directory when page loads
document.addEventListener('DOMContentLoaded', () => loadImages());
