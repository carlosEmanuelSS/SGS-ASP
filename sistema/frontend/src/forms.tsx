import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

/* ===== Peças compartilhadas dos formulários: seções em cartão, campos validados,
   progresso de preenchimento e escolhas segmentadas. ===== */

/** Cabeçalho do formulário: voltar, título com ícone e barra de progresso dos obrigatórios. */
export function FormProgressHeader({
  voltar,
  onVoltar,
  busy,
  icone,
  tom,
  eyebrow,
  titulo,
  descricao,
  preenchidos,
  total,
}: {
  voltar: string;
  onVoltar: () => void;
  busy?: boolean;
  icone: IconName;
  tom?: string;
  eyebrow: string;
  titulo: string;
  descricao: string;
  preenchidos: number;
  total: number;
}) {
  const pct = total ? Math.round((preenchidos / total) * 100) : 100;
  return (
    <>
      <button
        type="button"
        className="link back-link"
        onClick={onVoltar}
        disabled={busy}
      >
        <Icon name="arrowLeft" />
        {voltar}
      </button>
      <header className="page-head form-head">
        <div className="page-head-main">
          <span className={`page-icon ${tom || ""}`} aria-hidden="true">
            <Icon name={icone} />
          </span>
          <div>
            <span className="eyebrow-chip chip-neutral">{eyebrow}</span>
            <h1>{titulo}</h1>
            <p>{descricao}</p>
          </div>
        </div>
      </header>
      <div className="card form-progress">
        <div className="form-progress-text">
          <strong>
            {preenchidos === total ? (
              <>
                <Icon name="check" />
                Campos obrigatórios completos
              </>
            ) : (
              "Preenchimento dos campos obrigatórios"
            )}
          </strong>
          <span>
            {preenchidos} de {total} · {pct}%
          </span>
        </div>
        <div
          className="form-progress-track"
          role="progressbar"
          aria-label="Campos obrigatórios preenchidos"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={preenchidos}
        >
          <span style={{ width: pct + "%" }} />
        </div>
      </div>
    </>
  );
}

/** Seção do formulário em cartão, com título, descrição e grade de campos. */
export function FormSection({
  icone,
  titulo,
  descricao,
  children,
}: {
  icone: IconName;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      className="card form-section"
      role="group"
      aria-labelledby={id + "-t"}
    >
      <header className="form-section-head">
        <span className="form-section-icon" aria-hidden="true">
          <Icon name={icone} />
        </span>
        <div>
          <h2 id={id + "-t"}>{titulo}</h2>
          {descricao && <p>{descricao}</p>}
        </div>
      </header>
      <div className="form-grid">{children}</div>
    </section>
  );
}

type ControleProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

/**
 * Campo com rótulo, dica e validação: o erro do servidor tem prioridade; o erro local
 * só aparece depois que a pessoa sai do campo (ou tenta salvar).
 */
export function ValidatedFormField({
  rotulo,
  obrigatorio,
  dica,
  erro,
  ok,
  largo,
  contador,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
  ok?: boolean;
  largo?: boolean;
  contador?: [number, number];
  children: (props: ControleProps) => ReactNode;
}) {
  const id = useId();
  const descricoes = [erro && id + "-e", dica && id + "-d"].filter(Boolean);
  return (
    <div
      className={`field${largo ? " full" : ""}${erro ? " has-error" : ok ? " is-valid" : ""}`}
    >
      <label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span className="req"> *</span>}
      </label>
      <div className="field-control">
        {children({
          id,
          "aria-invalid": !!erro,
          "aria-describedby": descricoes.join(" ") || undefined,
        })}
        {ok && !erro && (
          <span className="field-ok" aria-hidden="true">
            <Icon name="check" />
          </span>
        )}
      </div>
      {erro ? (
        <span className="field-error" id={id + "-e"}>
          <Icon name="alert" />
          {erro}
        </span>
      ) : (
        (dica || contador) && (
          <span className="field-hint" id={dica ? id + "-d" : undefined}>
            <span>{dica}</span>
            {contador && (
              <span className="field-count">
                {contador[0].toLocaleString("pt-BR")}/
                {contador[1].toLocaleString("pt-BR")}
              </span>
            )}
          </span>
        )
      )}
    </div>
  );
}

/** Escolha única em botões segmentados (rádios nativos: setas do teclado funcionam). */
export function Segmentado<T extends string>({
  rotulo,
  obrigatorio,
  opcoes,
  valor,
  onChange,
  largo,
  disabled,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  opcoes: { valor: T; rotulo: string; icone?: IconName; disabled?: boolean }[];
  valor: T;
  onChange: (v: T) => void;
  largo?: boolean;
  disabled?: boolean;
}) {
  const nome = useId();
  return (
    <div className={`field${largo ? " full" : ""}`}>
      <span className="field-label" id={nome + "-l"}>
        {rotulo}
        {obrigatorio && <span className="req"> *</span>}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={nome + "-l"}>
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={`seg-option${valor === o.valor ? " active" : ""}`}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={valor === o.valor}
              disabled={disabled || o.disabled}
              onChange={() => onChange(o.valor)}
            />
            <span>
              {o.icone && <Icon name={o.icone} />}
              {o.rotulo}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Escolha única em cartões com explicação (ex.: nível de sigilo). */
export function OpcoesCartao<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  disabled,
}: {
  rotulo: string;
  opcoes: {
    valor: T;
    rotulo: string;
    descricao: string;
    icone: IconName;
    tom?: string;
  }[];
  valor: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const nome = useId();
  return (
    <div className="field full">
      <span className="sr-only" id={nome + "-l"}>
        {rotulo}
      </span>
      <div
        className="choice-cards"
        role="radiogroup"
        aria-labelledby={nome + "-l"}
      >
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={`choice-card ${o.tom || ""}${valor === o.valor ? " active" : ""}`}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={valor === o.valor}
              disabled={disabled}
              onChange={() => onChange(o.valor)}
            />
            <span className="choice-icon" aria-hidden="true">
              <Icon name={o.icone} />
            </span>
            <span className="choice-text">
              <strong>{o.rotulo}</strong>
              <small>{o.descricao}</small>
            </span>
            <span className="choice-check" aria-hidden="true">
              <Icon name="check" />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Seleção múltipla em botões (ex.: dias da semana). */
export function Alternancias({
  rotulo,
  obrigatorio,
  opcoes,
  marcados,
  onChange,
  erro,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  opcoes: string[];
  marcados: number[];
  onChange: (v: number[]) => void;
  erro?: string;
}) {
  const id = useId();
  return (
    <div className={`field full${erro ? " has-error" : ""}`}>
      <span className="field-label" id={id + "-l"}>
        {rotulo}
        {obrigatorio && <span className="req"> *</span>}
      </span>
      <div
        className="toggle-group"
        role="group"
        aria-labelledby={id + "-l"}
        aria-describedby={erro ? id + "-e" : undefined}
      >
        {opcoes.map((o, i) => {
          const on = marcados.includes(i);
          return (
            <button
              type="button"
              key={o}
              className={`toggle${on ? " active" : ""}`}
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on
                    ? marcados.filter((d) => d !== i)
                    : [...marcados, i].sort((a, b) => a - b),
                )
              }
            >
              {o}
            </button>
          );
        })}
      </div>
      {erro && (
        <span className="field-error" id={id + "-e"}>
          <Icon name="alert" />
          {erro}
        </span>
      )}
    </div>
  );
}

/** Rodapé fixo com o que falta preencher e as ações do formulário. */
export function FormFooter({
  faltam,
  children,
}: {
  faltam: number;
  children: ReactNode;
}) {
  return (
    <div className="form-footer">
      <span className={`form-footer-status${faltam ? "" : " done"}`}>
        <Icon name={faltam ? "info" : "check"} />
        {faltam
          ? `Falta${faltam === 1 ? "" : "m"} ${faltam} campo${faltam === 1 ? "" : "s"} obrigatório${faltam === 1 ? "" : "s"}`
          : "Tudo pronto para salvar"}
      </span>
      <div className="form-footer-actions">{children}</div>
    </div>
  );
}

/** Campos já visitados: o erro local só aparece depois do primeiro contato. */
export function useTocados() {
  const [tocados, setTocados] = useState<Set<string>>(() => new Set());
  const [todos, setTodos] = useState(false);
  return {
    foi: (k: string) => todos || tocados.has(k),
    tocar: (k: string) => setTocados((t) => (t.has(k) ? t : new Set(t).add(k))),
    tocarTodos: () => setTodos(true),
  };
}

export const soDigitos = (v: string) => v.replace(/\D/g, "");
export function mascaraCpf(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
export function mascaraTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const corpo = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${corpo.slice(0, corte)}${corpo.length > corte ? "-" + corpo.slice(corte) : ""}`;
}
/** Mesma regra do backend (alunos/forms.py). */
export function cpfValido(v: string) {
  const cpf = soDigitos(v);
  if (cpf.length !== 11 || new Set(cpf).size === 1) return false;
  for (const size of [9, 10]) {
    let total = 0;
    for (let i = 0; i < size; i++) total += Number(cpf[i]) * (size + 1 - i);
    if (((total * 10) % 11) % 10 !== Number(cpf[size])) return false;
  }
  return true;
}
export const hoje = () => new Date().toLocaleDateString("en-CA");
