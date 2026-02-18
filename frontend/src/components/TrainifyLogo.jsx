import styles from "./TrainifyLogo.module.css";

export default function TrainifyLogo(props) {
  const Tag = props.as || "div";
  const className = props.className || "";

  return (
    <Tag className={`${styles.logo} ${className}`}>
      Trainify<span className={styles.dot} aria-hidden="true"></span>
    </Tag>
  );
}
