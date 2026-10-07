import { createRoot } from "react-dom/client";
import TemplateLayoutEditor from "./pages/TemplateLayoutEditor";
import "./styles/app.css";
import "./styles/story.css";
import "./styles/template-editor.css";

createRoot(document.getElementById("root")).render(<TemplateLayoutEditor />);
