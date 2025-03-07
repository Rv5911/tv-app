export const Loader = () => {
    const loaderHTML = `
        <div class="loader-container">
            <div class="loader"></div>
            <p class="loading-text">Loading...</p>
        </div>
        <style>
            .loader-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
            }
            
            .loader {
                width: 48px;
                height: 48px;
                border: 5px solid #FFF;
                border-bottom-color: #FF3D00;
                border-radius: 50%;
                display: inline-block;
                box-sizing: border-box;
                animation: rotation 1s linear infinite;
            }

            .loading-text {
                color: #FF3D00;
                font-family: Arial, sans-serif;
                font-size: 18px;
                margin-top: 16px;
                animation: pulse 1.5s ease infinite;
            }

            @keyframes rotation {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>
    `;

    return loaderHTML;
};
