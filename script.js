// Supported image extensions
const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Global state
let allImages = [];
let currentSubsets = {};

async function loadImages() {
  const container = document.getElementById("productContainer");
  container.innerHTML = ""; // Clear existing content

  try {
    // Get selected subset
    const subsetSelect = document.getElementById("subsetSelect");
    const selectedSubset = subsetSelect.value;
    
    // Build query string
    const queryParam = selectedSubset ? `?subset=${encodeURIComponent(selectedSubset)}` : '';
    
    // Fetch list of files from server
    const response = await fetch(`/list-images${queryParam}`);
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
      label.style.whiteSpace = "pre-line"; // This will preserve the newlines
      // Get filename without extension and replace hyphens/underscores with spaces
      const imageName = image.path.split("/").pop().split(".")[0]
        .replace(/-/g, "\n")
        .replace(/_/g, " ")
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

// Collect the labels of everything the child has tapped
function getSelectedNames() {
  const selectedProducts = document.querySelectorAll(".product.selected");
  return Array.from(selectedProducts)
    .map((product) => {
      const labelText = product.querySelector(".product-label").textContent;
      // Labels break on newlines, so flatten them into a single line
      return labelText.replace(/\s+/g, " ").trim();
    })
    .filter((name) => name.length > 0);
}

// Copy text to the clipboard, falling back for non-secure contexts (e.g. http on the LAN)
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn("Clipboard API failed, falling back:", error);
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    console.error("Copy failed:", error);
  }
  document.body.removeChild(textarea);
  return copied;
}

function showStatus(message, isError) {
  const status = document.getElementById("selectionStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", Boolean(isError));
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    status.textContent = "";
  }, 4000);
}

// This function is called by index.html when the submit button is pressed
async function _showSelection() {
  const selectedNames = getSelectedNames();

  if (selectedNames.length === 0) {
    showStatus("Please pick at least one food first", true);
    return;
  }

  const message =
    "Please mum/dad may I have " + selectedNames.join(", ") + ", Thank you";

  const copied = await copyToClipboard(message);
  if (copied) {
    showStatus("Copied to clipboard - now paste it to mum or dad!");
  } else {
    showStatus("Could not copy automatically. Message: " + message, true);
  }
}

// Load subsets and populate dropdown
async function loadSubsets() {
  try {
    console.log("Loading subsets...");
    const response = await fetch("/subsets");
    console.log("Subsets response status:", response.status);
    currentSubsets = await response.json();
    console.log("Loaded subsets:", currentSubsets);
    
    const select = document.getElementById("subsetSelect");
    // Clear existing options except "All Foods"
    select.innerHTML = '<option value="">All Foods</option>';
    
    // Add subset options
    Object.keys(currentSubsets).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading subsets:", error);
  }
}

// Load all images for subset creation
async function loadAllImages() {
  try {
    const response = await fetch("/list-images");
    allImages = await response.json();
    return allImages;
  } catch (error) {
    console.error("Error loading all images:", error);
    return [];
  }
}

// Modal functions
function showCreateSubsetModal() {
  loadAllImages().then(images => {
    const grid = document.getElementById("allImagesGrid");
    grid.innerHTML = "";
    
    images.forEach(image => {
      const item = document.createElement("div");
      item.className = "image-item";
      item.dataset.path = image.path;
      
      const img = document.createElement("img");
      img.src = image.path;
      img.alt = "Food item";
      
      const name = document.createElement("div");
      name.className = "image-name";
      name.textContent = image.path.split("/").pop().split(".")[0]
        .replace(/-/g, " ")
        .replace(/_/g, " ");
      
      item.appendChild(img);
      item.appendChild(name);
      
      item.onclick = () => {
        item.classList.toggle("selected");
      };
      
      grid.appendChild(item);
    });
    
    document.getElementById("createSubsetModal").style.display = "block";
  });
}

function showManageSubsetsModal() {
  const list = document.getElementById("subsetsList");
  list.innerHTML = "";
  
  Object.entries(currentSubsets).forEach(([name, images]) => {
    const item = document.createElement("div");
    item.className = "subset-item";
    
    item.innerHTML = `
      <div class="subset-info">
        <div class="subset-name">${name}</div>
        <div class="subset-count">${images.length} items</div>
      </div>
      <div class="subset-actions-inline">
        <button onclick="editSubset('${name}')">Edit</button>
        <button onclick="deleteSubset('${name}')">Delete</button>
      </div>
    `;
    
    list.appendChild(item);
  });
  
  document.getElementById("manageSubsetsModal").style.display = "block";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
  // Clear forms
  if (modalId === "createSubsetModal") {
    document.getElementById("newSubsetName").value = "";
  }
}

async function saveNewSubset() {
  const name = document.getElementById("newSubsetName").value.trim();
  if (!name) {
    alert("Please enter a collection name");
    return;
  }
  
  const selectedItems = document.querySelectorAll("#allImagesGrid .image-item.selected");
  const images = Array.from(selectedItems).map(item => item.dataset.path);
  
  if (images.length === 0) {
    alert("Please select at least one food item");
    return;
  }
  
  try {
    console.log("Saving subset:", { name, images });
    const response = await fetch("/subsets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, images })
    });
    
    console.log("Response status:", response.status);
    
    if (response.ok) {
      closeModal("createSubsetModal");
      await loadSubsets(); // Refresh dropdown
      alert("Collection saved successfully!");
    } else {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      let errorMessage = "Unknown error";
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorText;
      } catch {
        errorMessage = errorText;
      }
      alert("Error saving collection: " + errorMessage);
    }
  } catch (error) {
    console.error("Network error saving subset:", error);
    alert("Network error saving collection. Check that the server is running.");
  }
}

async function deleteSubset(name) {
  if (!confirm(`Are you sure you want to delete the "${name}" collection?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/subsets/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
    
    if (response.ok) {
      await loadSubsets(); // Refresh dropdown
      showManageSubsetsModal(); // Refresh the modal
      alert("Collection deleted successfully!");
    } else {
      const error = await response.json();
      alert("Error deleting collection: " + error.error);
    }
  } catch (error) {
    console.error("Error deleting subset:", error);
    alert("Error deleting collection");
  }
}

function editSubset(name) {
  // Pre-populate the create modal with existing subset data
  document.getElementById("newSubsetName").value = name;
  
  loadAllImages().then(images => {
    const grid = document.getElementById("allImagesGrid");
    grid.innerHTML = "";
    const subsetImages = currentSubsets[name] || [];
    
    images.forEach(image => {
      const item = document.createElement("div");
      item.className = "image-item";
      item.dataset.path = image.path;
      
      // Pre-select if in subset
      if (subsetImages.includes(image.path)) {
        item.classList.add("selected");
      }
      
      const img = document.createElement("img");
      img.src = image.path;
      img.alt = "Food item";
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "image-name";
      nameDiv.textContent = image.path.split("/").pop().split(".")[0]
        .replace(/-/g, " ")
        .replace(/_/g, " ");
      
      item.appendChild(img);
      item.appendChild(nameDiv);
      
      item.onclick = () => {
        item.classList.toggle("selected");
      };
      
      grid.appendChild(item);
    });
    
    closeModal("manageSubsetsModal");
    document.getElementById("createSubsetModal").style.display = "block";
  });
}

// Load subsets and images when page loads
document.addEventListener("DOMContentLoaded", async () => {
  await loadSubsets();
  loadImages();
});
