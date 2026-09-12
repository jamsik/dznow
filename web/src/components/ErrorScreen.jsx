import { Component } from "react";

/**
 * Ошибка в любом компоненте больше не оборачивается белым экраном:
 * React ловит её здесь и показывает текст, по которому видно, куда смотреть.
 */
export default class ErrorScreen extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: "" };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[DZNOW] упал компонент:", error, info);
    this.setState({ stack: (info && info.componentStack) || "" });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="errscreen">
        <h1>Что-то сломалось</h1>
        <p className="msg">{String(error && error.message ? error.message : error)}</p>
        {stack && <pre>{stack.trim().split("\n").slice(0, 8).join("\n")}</pre>}
        <button className="btn primary" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    );
  }
}
