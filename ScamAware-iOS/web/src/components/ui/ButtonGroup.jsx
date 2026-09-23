export function ButtonGroup({ className = '', children }) {
  return <div className={`btns${className ? ' ' + className : ''}`}>{children}</div>;
}
