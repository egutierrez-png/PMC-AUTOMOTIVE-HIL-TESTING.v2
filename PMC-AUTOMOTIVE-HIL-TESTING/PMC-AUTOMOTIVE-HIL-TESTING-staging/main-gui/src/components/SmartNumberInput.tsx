import { useState, useEffect, useRef } from "react";

type Props = {
  value?: number | "";
  onChange: (v: number | "") => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

export default function SmartNumberInput({ value, onChange, className, ...rest }: Props) {
  const [local, setLocal] = useState(value === undefined ? "" : value);
  const ref = useRef<HTMLInputElement>(null);

  // 🔹 Si el valor externo cambia (por ejemplo al seleccionar otro step), sincroniza:
  useEffect(() => {
    setLocal(value === undefined ? "" : value);
  }, [value]);

  // 🔹 No perdemos el foco porque solo actualizamos el valor interno
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocal(val === "" ? "" : Number(val));
    const num = val === "" ? "" : Number(val);
    if (!isNaN(num as number)) onChange(num);
  };

  return (
    <input
      ref={ref}
      type="number"
      value={local}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  );
}
