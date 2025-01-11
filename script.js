// Supported image extensions
const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

async function loadImages() {
  const container = document.getElementById("productContainer");
  container.innerHTML = ""; // Clear existing content

  try {
    // Fetch list of files from server
    const response = await fetch("/list-images");
    const images = await response.json();

    images.forEach((image, index) => {
      const productDiv = document.createElement("div");
      productDiv.className = "product";

      const img = document.createElement("img");
      img.src = image.path; // Use the full path from server
      img.alt = `Product ${index + 1}`;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "product";
      input.value = image.path;
      input.id = `product-${index}`;

      const label = document.createElement("div");
      label.className = "product-label";
      // Get filename without extension and replace hyphens/underscores with spaces
      const imageName = image.path.split("/").pop().split(".")[0]
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word
      label.textContent = imageName;

      // Make the whole product div clickable with toggle functionality
      productDiv.onclick = function () {
        if (productDiv.classList.contains("selected")) {
          // If already selected, deselect it
          productDiv.classList.remove("selected");
          input.checked = false;
        } else {
          // If not selected, select it
          productDiv.classList.add("selected");
          input.checked = true;
        }
      };

      productDiv.appendChild(img);
      productDiv.appendChild(input);
      productDiv.appendChild(label);
      container.appendChild(productDiv);
    });
  } catch (error) {
    console.error("Error loading images:", error);
    alert("Error loading images. Please check the console for details.");
  }
}

// This function is called by index.html when the submit button is pressed
function _showSelection() {
  const selectedProducts = document.querySelectorAll(".product.selected");
  if (selectedProducts.length > 0) {
    const selectedNames = Array.from(selectedProducts).map((product) => {
      return product.querySelector(".product-label").textContent;
    });

    if (selectedNames.length === 1) {
      alert("You selected: " + selectedNames[0]);
    } else {
      alert("You selected:\n" + selectedNames.join("\n"));
    }
  } else {
    alert("Please select one or more products by clicking on the images.");
  }
}

// Load images from root directory when page loads
document.addEventListener("DOMContentLoaded", () => loadImages());
