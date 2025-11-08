import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router } from "react-router-dom"
import { ToastProvider } from "./context/ToastContext"
import AppWrapper from "./App.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Router>
            <ToastProvider>
                <AppWrapper />
            </ToastProvider>
        </Router>
    </StrictMode>
)
