export const Loader = () => {
    const loaderHTML = `
    <div class="loader-div">
        <div class="loader-container">
            <div class="loader"></div>
        </div>
        </div>

    `;

    return loaderHTML;
};


// Function to show loader
export function showLoader() {
    const loader = document.querySelector(".loader-div");
    if (loader) loader.style.display = "block";
}

// Function to hide loader
export function hideLoader() {
    const loader = document.querySelector(".loader-div");
    if (loader) loader.style.display = "none";
}