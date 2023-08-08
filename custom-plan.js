import React, {
  useRef,
  useState,
  useEffect,
  useId,
} from "https://esm.sh/react?module";
import ReactDOM, { createPortal } from "https://esm.sh/react-dom?module";
import htm from "https://esm.sh/htm?module";

const html = htm.bind(React.createElement);

function ReadingRow(props) {
  const {
    reading: { passages, day, week },
    cadence,
    onChange,
  } = props;
  const [passageInput, setPassageInput] = useState(passages.join(", "));
  return html`<tr>
    <td>${cadence === "daily" ? day : week}</td>
    <td>
      <input
        type="text"
        className="form-control"
        value=${passageInput}
        onChange=${(e) => {
          setPassageInput(e.target.value);
          onChange(e.target.value.split(",").map((p) => p.trim()));
        }}
      />
    </td>
  </tr>`;
}

function ReadingTable(props) {
  const { readings, cadence, onReadingChange } = props;
  return html`<table className="table table-striped">
    <thead>
      <tr>
        <th scope="col">${cadence === "daily" ? "Day" : "Week"}</th>
        <th scope="col">Passages (comma separated)</th>
      </tr>
    </thead>
    <tbody>
      ${readings.map(
        (r, idx) =>
          html`<${ReadingRow}
            key=${idx}
            reading=${r}
            cadence=${cadence}
            onChange=${(passages) => {
              onReadingChange(idx, passages);
            }}
          />`
      )}
    </tbody>
  </table>`;
}

function Modal(props) {
  const { open, title, children, onClose, onAction, actionText } = props;
  const modalId = useId();
  const labelId = useId();
  const modalRef = useRef(null);

  useEffect(() => {
    modalRef.current = new bootstrap.Modal(
      document.getElementById(modalId),
      {}
    );
  }, []);

  useEffect(() => {
    if (open) {
      modalRef.current.show();
    } else {
      modalRef.current.hide();
    }
  }, [open]);

  return createPortal(
    html`<div
      class="modal fade"
      id=${modalId}
      tabindex="-1"
      aria-labelledby=${labelId}
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id=${labelId}>${title}</h1>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              onClick=${() => onClose()}
            ></button>
          </div>
          <div class="modal-body">${children}</div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              onClick=${() => onClose()}
            >
              Close
            </button>
            <button
              type="button"
              class="btn btn-primary"
              onClick=${() => onAction()}
            >
              ${actionText}
            </button>
          </div>
        </div>
      </div>
    </div>`,
    document.body
  );
}

function AddBibleBookButton(props) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const { cadence, onAddPassages } = props;
  const [books, setBooks] = useState([]); // ['Genesis', 'Exodus', ...]
  const [book, setBook] = useState("Genesis");

  const action = () => {
    const newPassages = [];
    const bookIdx = books.findIndex((b) => b.name === book);
    for (let i = 0; i < books[bookIdx].chapters; i++) {
      newPassages.push(`${book} ${i + 1}`);
    }
    onAddPassages(newPassages);
    setShowGenerateModal(false);
  };

  useEffect(() => {
    fetch("/bible-books.json")
      .then((res) => res.json())
      .then((bks) => {
        setBooks(
          bks.map((b) => ({
            name: b.name,
            chapters: b.chapters,
          }))
        );
      });
  }, []);

  return html`<button
      type="button"
      className="btn btn-outline-primary float-end"
      onClick=${() => setShowGenerateModal(true)}
    >
      Add Bible Book
    </button>
    <${Modal}
      open=${showGenerateModal}
      title="Add Bible Book"
      onClose=${() => setShowGenerateModal(false)}
      onAction=${action}
      actionText="Add Book"
    >
      <div className="mb-3">
        <label for="book" className="form-label">Bible Book</label>
        <select
          className="form-select"
          id="book"
          aria-describedby="bookHelp"
          value=${book}
          onChange=${(e) => setBook(e.target.value)}
        >
          ${books.map(
            (b) =>
              html`<option value=${b.name}>
                ${b.name} - ${b.chapters} chapters
              </option>`
          )}
        </select>
        <div id="bookHelp" className="form-text">
          Each chapter will be added
          per${cadence === "daily" ? " day" : " week"}.
        </div>
      </div>
    <//>`;
}

function App() {
  const fileInput = useRef(null);
  const [resetKey, setResetKey] = useState(0);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [author, setAuthor] = useState("");
  const [type, setType] = useState("wholebible");
  const [cadence, setCadence] = useState("daily");
  const [readings, setReadings] = useState([]);

  const planCompletionHandler = (plan) => {
    if (window.planCompletionHandler) {
      window.planCompletionHandler(JSON.stringify(plan));
    } else {
      downloadFile(
        `${plan.name}.json`,
        "application/json",
        JSON.stringify(plan)
      );
    }
  };
  const isEmbedded = !!window.planCompletionHandler;

  const restart = () => {
    if (confirm("Are you sure you want to start over?") === false) return;
    setName("");
    setDesc("");
    setAuthor("");
    setType("wholebible");
    setCadence("daily");
    setReadings([]);
    setResetKey(resetKey + 1);
  };

  const onReadingChange = (idx, passages) => {
    const newReadings = [...readings];
    newReadings[idx].passages = passages;
    setReadings(newReadings);
  };

  const addPassages = (passages) => {
    const newReadings = [...readings];
    passages.forEach((p, idx) => {
      newReadings.push({
        title: `${cadence === "daily" ? "Day" : "Week"} ${readings.length + idx + 1}`,
        ...(cadence === "daily"
          ? { day: readings.length + idx + 1 }
          : { week: readings.length + idx + 1 }),
        passages: [p],
      });
    });
    setReadings(newReadings);
  };

  const onCadenceChange = (e) => {
    setCadence(e.target.value);
    if (e.target.value === "daily") {
      setReadings(
        readings.map((r, idx) => ({ ...r, title: `Day ${idx + 1}`, day: idx + 1, week: undefined }))
      );
    } else {
      setReadings(
        readings.map((r, idx) => ({ ...r, title: `Week ${idx + 1}`, day: undefined, week: idx + 1 }))
      );
    }
  };

  const importPlanClicked = () => {
    fileInput.current.click();
  };

  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target.result;
      const parsed = JSON.parse(contents);
      setName(parsed.name);
      setDesc(parsed.desc);
      setAuthor(parsed.author);
      setType(parsed.type);
      if (parsed.readings[0].day) {
        setCadence("daily");
      } else {
        setCadence("weekly");
      }
      setReadings(parsed.readings);
      setResetKey(resetKey + 1);
    };
    reader.readAsText(file);
  };

  const exportFile = () => {
    // TODO: validate
    const plan = {
      id: idFromName(name),
      website: "",
      copyright: "",
      builtin: false,
      name,
      desc,
      author,
      type,
      readings,
    };
    planCompletionHandler(plan);
  };

  return html`<div className="container">
    <h2>Reading Plan Builder</h2>
    <p>Build your own reading plan for Walk Daily.</p>
    <input
      ref=${fileInput}
      onChange=${importFile}
      type="file"
      accept="application/json"
      style=${{ display: "none" }}
    />
    <div className="d-grid gap-2 d-md-block">
      ${!isEmbedded &&
      html`<button
        type="button"
        className="btn btn-secondary me-md-3"
        onClick=${importPlanClicked}
      >
        <i className="fa-solid fa-file-import"></i> Import Plan
      </button> `}
      <button
        type="button"
        className="btn btn-primary me-md-3"
        onClick=${exportFile}
      >
        <i className="fa-solid fa-download"></i> ${isEmbedded
          ? "Create Plan"
          : "Export Plan"}
      </button>
      <button
        type="button"
        className="btn btn-danger float-sm-end"
        onClick=${restart}
      >
        <i class="fa-solid fa-rotate-right"></i> Start Over
      </button>
    </div>
    <form className="mt-4 mb-4">
      <div className="mb-3">
        <label for="type" className="form-label">Kind of plan</label>
        <select
          className="form-select"
          id="type"
          aria-describedby="typeHelp"
          value=${type}
          onChange=${(e) => setType(e.target.value)}
        >
          <option value="wholebible">
            Whole Bible - a complete cover to cover Bible reading
          </option>
          <option value="partialbible">
            Partial Bible - only a part of the Bible will be read (e.g. Psalms)
          </option>
          <option value="otherbook">Other Book - a non-Bible book</option>
        </select>
      </div>
      <div className="mb-3">
        <label for="name" className="form-label">Plan name</label>
        <input
          type="text"
          className="form-control"
          id="name"
          aria-describedby="nameHelp"
          value=${name}
          onChange=${(e) => setName(e.target.value)}
        />
        <div id="nameHelp" className="form-text">
          The name of the plan as it will show in the app.
        </div>
      </div>
      <div className="mb-3">
        <label for="desc" className="form-label">Plan description</label>
        <input
          type="text"
          className="form-control"
          id="desc"
          aria-describedby="descHelp"
          value=${desc}
          onChange=${(e) => setDesc(e.target.value)}
        />
        <div id="descHelp" className="form-text">
          Tell others what this plan entails.
        </div>
      </div>
      <div className="mb-3">
        <label for="author" className="form-label">Author</label>
        <input
          type="text"
          className="form-control"
          id="author"
          aria-describedby="authorHelp"
          value=${author}
          onChange=${(e) => setAuthor(e.target.value)}
        />
        <div id="authorHelp" className="form-text">
          Who came up with this plan?
        </div>
      </div>
      <div className="mb-3">
        <label for="cadence" className="form-label">Reading cadence</label>
        <select
          className="form-select"
          id="cadence"
          aria-describedby="cadenceHelp"
          value=${cadence}
          onChange=${onCadenceChange}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div className="form-label mb-3">
        ${readings.length} ${cadence === "daily" ? "days" : "weeks"} of readings
      </div>
      <div className="d-grid gap-2 d-md-block">
        <button
          type="button"
          className="btn btn-outline-success me-md-3"
          onClick=${() =>
            setReadings([
              ...readings,
              {
                ...(cadence === "daily"
                  ? {
                      title: `Day ${readings.length + 1}`,
                      day: readings.length + 1,
                    }
                  : {
                      title: `Week ${readings.length + 1}`,
                      week: readings.length + 1,
                    }),
                passages: [],
              },
            ])}
        >
          <i className="fa-solid fa-plus"></i> Add Passage
        </button>
        <button
          type="button"
          className="btn btn-outline-warning me-md-3"
          onClick=${() => setReadings(readings.slice(0, -1))}
        >
          <i className="fa-solid fa-minus"></i> Remove Passage
        </button>
        ${(type === "wholebible" || type === 'partialbible') &&
        html`<${AddBibleBookButton}
          cadence=${cadence}
          onAddPassages=${addPassages}
        />`}
      </div>
    </form>
    <${ReadingTable}
      key=${`reading-table-${resetKey}`}
      readings=${readings}
      cadence=${cadence}
      onReadingChange=${onReadingChange}
    />
  </div>`;
}

function downloadFile(filename, mime, content) {
  const link = document.createElement("a");
  const file = new Blob([content], { type: mime });
  link.href = URL.createObjectURL(file);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function idFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

ReactDOM.render(html`<${App} />`, document.getElementById("app"));
