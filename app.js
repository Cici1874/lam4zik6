const {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect
} = React;

// ============================================================
// 林夕粵語填詞作品 Credit 查詢 v3
// ============================================================

// --- Morandi Palette ---
const LIGHT = {
  bg: "#f0ece4",
  card: "#e8e2d8",
  cardHover: "#dfd8cb",
  border: "#d1c9ba",
  text: "#4a4640",
  textMid: "#7a746b",
  textLight: "#a39d93",
  accent: "#8b7e74",
  accentSoft: "#b5a99b",
  tag: "#c5b9a8",
  tagText: "#6b6158",
  pink: "#c4a6a0",
  green: "#a3b0a0",
  blue: "#9aabb8",
  lavender: "#b0a5b8",
  white: "#faf8f4",
  shadow: "rgba(74,70,64,0.06)",
  pillBg: "#e2dbd0",
  pillActive: "#8b7e74",
  pillActiveText: "#faf8f4",
  link: "#7a6e63",
  linkHover: "#5a4f44"
};
const DARK = {
  bg: "#2a2725",
  card: "#353130",
  cardHover: "#3e3a38",
  border: "#4a4543",
  text: "#d8d2ca",
  textMid: "#a39d93",
  textLight: "#7a746b",
  accent: "#b5a99b",
  accentSoft: "#8b7e74",
  tag: "#4a4543",
  tagText: "#c5b9a8",
  pink: "#a08078",
  green: "#7a8a77",
  blue: "#7a8e9a",
  lavender: "#8a7f92",
  white: "#333030",
  shadow: "rgba(0,0,0,0.2)",
  pillBg: "#3e3a38",
  pillActive: "#b5a99b",
  pillActiveText: "#2a2725",
  link: "#c5b9a8",
  linkHover: "#d8d2ca"
};
let C = {
  ...LIGHT
};
const THEME_KEY = "linxi-theme";

// Initialize C from localStorage immediately (before first render)
try {
  if (typeof localStorage !== "undefined" && localStorage.getItem(THEME_KEY) === "dark") {
    Object.assign(C, DARK);
  }
} catch (e) {}
function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch (e) {
      return false;
    }
  });
  // renderKey forces full re-render of entire tree when theme changes
  const [renderKey, setRenderKey] = useState(0);
  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      Object.assign(C, next ? DARK : LIGHT);
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch (e) {}
      return next;
    });
    setRenderKey(k => k + 1);
  }, []);
  return [dark, toggle, renderKey];
}
const SOURCE_LABELS = {
  "日": {
    label: "日本",
    color: C.pink
  },
  "韓": {
    label: "韓國",
    color: C.lavender
  },
  "外": {
    label: "歐美",
    color: C.blue
  },
  "混": {
    label: "中外合作",
    color: C.green
  },
  "泰": {
    label: "泰國",
    color: C.accentSoft
  },
  "法": {
    label: "法國",
    color: C.blue
  },
  "美": {
    label: "美國",
    color: C.blue
  }
};
const TABS = [{
  id: "singer",
  label: "按歌手"
}, {
  id: "composer",
  label: "按作曲"
}, {
  id: "year",
  label: "按年份"
}, {
  id: "cross",
  label: "交叉查詢"
}, {
  id: "compare",
  label: "歌手對比"
}, {
  id: "stats",
  label: "統計"
}];

// ============================================================
// 繁簡互通
// ============================================================
function toSimplified(str) {
  if (!str || typeof T2S === "undefined") return (str || "").toLowerCase();
  return [...str].map(ch => T2S[ch] || ch).join("").toLowerCase();
}
function matchQuery(text, query) {
  if (!query) return true;
  return toSimplified(text).includes(toSimplified(query));
}

// Highlight matching substring
function Highlight({
  text,
  query
}) {
  if (!query || !text) return text || "";
  const simpText = toSimplified(text);
  const simpQuery = toSimplified(query);
  const idx = simpText.indexOf(simpQuery);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return /*#__PURE__*/React.createElement(React.Fragment, null, before, /*#__PURE__*/React.createElement("mark", {
    style: {
      background: C.tag,
      color: C.text,
      borderRadius: 2,
      padding: "0 1px"
    }
  }, match), after);
}

// ============================================================
// Utility
// ============================================================
function buildIndex(songs) {
  const singers = {},
    composers = {},
    years = {};
  songs.forEach((s, i) => {
    if (s.s) {
      if (!singers[s.s]) singers[s.s] = [];
      singers[s.s].push(i);
    }
    if (s.c) {
      if (!composers[s.c]) composers[s.c] = [];
      composers[s.c].push(i);
    }
    if (s.y) {
      if (!years[s.y]) years[s.y] = [];
      years[s.y].push(i);
    }
  });
  return {
    singers,
    composers,
    years
  };
}
function sortedEntries(obj) {
  return Object.entries(obj).sort((a, b) => b[1].length - a[1].length);
}

// ============================================================
// Shared Components
// ============================================================
function Tag({
  label,
  color
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      fontSize: 11,
      padding: "1px 6px",
      borderRadius: 3,
      background: color || C.tag,
      color: C.tagText,
      marginLeft: 6,
      verticalAlign: "middle",
      fontWeight: 500
    }
  }, label);
}
function SearchInput({
  value,
  onChange,
  placeholder
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: placeholder,
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 14px 10px 36px",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      color: C.text,
      fontSize: 14,
      outline: "none",
      fontFamily: "inherit"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)",
      color: C.textLight,
      fontSize: 15,
      pointerEvents: "none"
    }
  }, "⌕"));
}
function NameList({
  entries,
  onSelect,
  selected,
  labelSuffix = "首"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 420,
      overflowY: "auto",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white
    }
  }, entries.map(([name, indices]) => {
    const isActive = selected === name;
    return /*#__PURE__*/React.createElement("div", {
      key: name,
      onClick: () => onSelect(name),
      style: {
        padding: "9px 14px",
        cursor: "pointer",
        background: isActive ? C.card : "transparent",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background .15s"
      },
      onMouseEnter: e => {
        if (!isActive) e.currentTarget.style.background = C.cardHover;
      },
      onMouseLeave: e => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.text,
        fontSize: 14
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textLight,
        fontSize: 12
      }
    }, indices.length, " ", labelSuffix));
  }), entries.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      textAlign: "center",
      color: C.textLight,
      fontSize: 13
    }
  }, "無結果"));
}

// ============================================================
// Clickable Name (link-style text for drill-down)
// ============================================================
function ClickableName({
  name,
  onClick,
  color
}) {
  if (!name || !onClick) return /*#__PURE__*/React.createElement("span", {
    style: {
      color: color || C.textMid
    }
  }, name || "—");
  return /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      onClick(name);
    },
    style: {
      color: C.link,
      cursor: "pointer",
      borderBottom: `1px dashed ${C.border}`,
      transition: "color .15s"
    },
    onMouseEnter: e => {
      e.currentTarget.style.color = C.linkHover;
      e.currentTarget.style.borderBottomColor = C.linkHover;
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = C.link;
      e.currentTarget.style.borderBottomColor = C.border;
    }
  }, name);
}

// ============================================================
// Breadcrumb
// ============================================================
function Breadcrumb({
  stack,
  onNavigate
}) {
  if (!stack || stack.length === 0) return null;
  const isMobile = useIsMobile();

  // On mobile, if more than 3 levels, show: first … prev › current
  let display = stack;
  if (isMobile && stack.length > 3) {
    display = [stack[0], {
      label: "…",
      ellipsis: true
    }, stack[stack.length - 2], stack[stack.length - 1]];
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flexWrap: "wrap",
      marginBottom: 10,
      fontSize: 13,
      color: C.textMid
    }
  }, display.map((item, i) => {
    // Map display index back to real stack index for navigation
    let realIdx;
    if (isMobile && stack.length > 3) {
      if (i === 0) realIdx = 0;else if (item.ellipsis) realIdx = -1;else if (i === display.length - 2) realIdx = stack.length - 2;else realIdx = stack.length - 1;
    } else {
      realIdx = i;
    }
    const isLast = i === display.length - 1;
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, i > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textLight
      }
    }, "›"), item.ellipsis ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textLight
      }
    }, "…") : !isLast ? /*#__PURE__*/React.createElement("span", {
      onClick: () => realIdx >= 0 && onNavigate(realIdx),
      style: {
        color: C.link,
        cursor: "pointer",
        borderBottom: `1px dashed ${C.border}`
      }
    }, item.label) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.text,
        fontWeight: 600
      }
    }, item.label));
  }));
}

// ============================================================
// DrillDown Song Table (with clickable singer & composer)
// ============================================================
const thStyle = {
  padding: "8px 10px",
  fontWeight: 600,
  color: C.text,
  fontSize: 12,
  letterSpacing: 0.5,
  borderBottom: `2px solid ${C.border}`,
  textAlign: "center"
};
const tdStyle = {
  padding: "8px 10px",
  color: C.text
};
const backBtnStyle = {
  background: "none",
  border: "none",
  color: C.accent,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "4px 0",
  marginBottom: 8,
  display: "block",
  fontWeight: 500
};
function SongTable({
  songs,
  data,
  showSinger = true,
  showComposer = true,
  showYear = true,
  onClickSinger,
  onClickComposer,
  onClickYear
}) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  if (!songs || songs.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 20,
        color: C.textLight,
        fontSize: 13,
        textAlign: "center"
      }
    }, "選擇項目查看作品");
  }
  const sorted = [...songs].sort((a, b) => (data[a].y || 0) - (data[b].y || 0));
  const handleCopy = () => {
    const lines = sorted.map(idx => {
      const s = data[idx];
      const parts = [];
      if (showYear) parts.push(s.y);
      parts.push(s.t);
      if (showSinger) parts.push(s.s);
      if (showComposer) parts.push(s.c || "—");
      return parts.join("\t");
    });
    const header = [];
    if (showYear) header.push("年份");
    header.push("歌曲");
    if (showSinger) header.push("歌手");
    if (showComposer) header.push("作曲");
    const text = header.join("\t") + "\n" + lines.join("\n");
    try {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (e) {}
  };
  const copyBtn = /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCopy,
    style: {
      background: "none",
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      padding: "3px 10px",
      cursor: "pointer",
      color: copied ? C.green : C.textLight,
      fontSize: 11,
      fontFamily: "inherit",
      transition: "all .15s"
    }
  }, copied ? "已複製 ✓" : `複製 ${sorted.length} 首`));

  // Mobile: card layout
  if (isMobile) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxHeight: "70vh",
        overflowY: "auto"
      }
    }, copyBtn, sorted.map((idx, i) => {
      const s = data[idx];
      const src = s.r && SOURCE_LABELS[s.r];
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          padding: "10px 14px",
          background: C.white,
          borderRadius: 8,
          marginBottom: 6,
          border: `1px solid ${C.border}`
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          color: C.text,
          fontWeight: 500,
          flex: 1
        }
      }, s.t, src && /*#__PURE__*/React.createElement(Tag, {
        label: src.label,
        color: src.color
      })), showYear && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          flexShrink: 0
        }
      }, onClickYear ? /*#__PURE__*/React.createElement(ClickableName, {
        name: String(s.y),
        onClick: v => onClickYear(Number(v)),
        color: C.textLight
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: C.textLight
        }
      }, s.y))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: C.textMid,
          marginTop: 4,
          display: "flex",
          gap: 12,
          flexWrap: "wrap"
        }
      }, showSinger && /*#__PURE__*/React.createElement("span", null, "歌手：", /*#__PURE__*/React.createElement(ClickableName, {
        name: s.s,
        onClick: onClickSinger,
        color: C.textMid
      })), showComposer && /*#__PURE__*/React.createElement("span", null, "曲：", s.c ? /*#__PURE__*/React.createElement(ClickableName, {
        name: s.c,
        onClick: onClickComposer,
        color: C.textMid
      }) : "—")));
    }));
  }

  // Desktop: table layout
  return /*#__PURE__*/React.createElement("div", null, copyBtn, /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 480,
      overflowY: "auto",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.card,
      position: "sticky",
      top: 0,
      zIndex: 1
    }
  }, showYear && /*#__PURE__*/React.createElement("th", {
    style: thStyle
  }, "年份"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...thStyle,
      textAlign: "left"
    }
  }, "歌曲"), showSinger && /*#__PURE__*/React.createElement("th", {
    style: {
      ...thStyle,
      textAlign: "left"
    }
  }, "歌手"), showComposer && /*#__PURE__*/React.createElement("th", {
    style: {
      ...thStyle,
      textAlign: "left"
    }
  }, "作曲"))), /*#__PURE__*/React.createElement("tbody", null, sorted.map((idx, i) => {
    const s = data[idx];
    const src = s.r && SOURCE_LABELS[s.r];
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderBottom: `1px solid ${C.border}`
      },
      onMouseEnter: e => e.currentTarget.style.background = C.cardHover,
      onMouseLeave: e => e.currentTarget.style.background = "transparent"
    }, showYear && /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdStyle,
        width: 50,
        textAlign: "center"
      }
    }, onClickYear ? /*#__PURE__*/React.createElement(ClickableName, {
      name: String(s.y),
      onClick: v => onClickYear(Number(v)),
      color: C.textMid
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textMid
      }
    }, s.y)), /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, s.t, src && /*#__PURE__*/React.createElement(Tag, {
      label: src.label,
      color: src.color
    })), showSinger && /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, /*#__PURE__*/React.createElement(ClickableName, {
      name: s.s,
      onClick: onClickSinger,
      color: C.textMid
    })), showComposer && /*#__PURE__*/React.createElement("td", {
      style: tdStyle
    }, s.c ? /*#__PURE__*/React.createElement(ClickableName, {
      name: s.c,
      onClick: onClickComposer,
      color: C.textMid
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textLight
      }
    }, "—")));
  })))));
}

// ============================================================
// DrillDown View (shows a person's songs with full navigation)
// ============================================================
function DrillDownView({
  type,
  name,
  data,
  index,
  onClickSinger,
  onClickComposer,
  onClickYear
}) {
  const songs = type === "singer" ? index.singers[name] || [] : type === "composer" ? index.composers[name] || [] : type === "year" ? index.years[Number(name)] || index.years[name] || [] : [];
  // singer view: hide singer col, show composer+year; composer view: hide composer col; year view: hide year col
  const showSinger = type !== "singer";
  const showComposer = type !== "composer";
  const showYear = type !== "year";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      color: C.textMid,
      fontSize: 13
    }
  }, type === "year" ? `${name} 年：林夕該年 ${songs.length} 首作品` : type === "singer" ? `${name}：${songs.length} 首粵語作品` : `${name}：與林夕合作 ${songs.length} 首`), /*#__PURE__*/React.createElement(SongTable, {
    songs: songs,
    data: data,
    showSinger: showSinger,
    showComposer: showComposer,
    showYear: showYear,
    onClickSinger: onClickSinger,
    onClickComposer: onClickComposer,
    onClickYear: onClickYear
  }));
}

// ============================================================
// Hook: useNavStack (shared drill-down logic)
// ============================================================
function useNavStack() {
  const [stack, setStack] = useState([]);
  const push = useCallback((type, name) => {
    setStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1].type === type && prev[prev.length - 1].name === name) return prev;
      const label = type === "year" ? `${name} 年` : name;
      return [...prev, {
        type,
        name,
        label
      }];
    });
  }, []);
  const navigateTo = useCallback(idx => {
    setStack(prev => prev.slice(0, idx + 1));
  }, []);
  const clear = useCallback(() => setStack([]), []);
  const current = stack.length > 0 ? stack[stack.length - 1] : null;
  return {
    stack,
    push,
    navigateTo,
    clear,
    current
  };
}

// ============================================================
// Responsive: detect mobile
// ============================================================
function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return mobile;
}

// ============================================================
// Tab: 按歌手
// ============================================================
function TabSinger({
  data,
  index,
  jumpTo,
  clearJump
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const nav = useNavStack();
  const isMobile = useIsMobile();

  // Handle jumpTo from GlobalSearch or Stats
  useEffect(() => {
    if (jumpTo && jumpTo.name && index.singers[jumpTo.name]) {
      setSelected(jumpTo.name);
      nav.clear();
      if (clearJump) clearJump();
    }
  }, [jumpTo]);
  const filtered = useMemo(() => {
    const all = sortedEntries(index.singers);
    if (!search.trim()) return all;
    return all.filter(([name]) => matchQuery(name, search.trim()));
  }, [index.singers, search]);
  const songs = selected ? index.singers[selected] : null;
  const handleSelect = name => {
    setSelected(name);
    nav.clear();
    writeHash({
      tab: "singer",
      s: name
    });
  };
  const handleClickComposer = name => {
    if (index.composers[name]) {
      if (nav.stack.length === 0 && selected) {
        nav.push("singer", selected);
      }
      nav.push("composer", name);
    }
  };
  const handleClickSinger = name => {
    if (index.singers[name]) {
      nav.push("singer", name);
    }
  };
  const handleClickYear = year => {
    if (index.years[year]) {
      if (nav.stack.length === 0 && selected) {
        nav.push("singer", selected);
      }
      nav.push("year", String(year));
    }
  };
  const showDrillDown = nav.current !== null;
  const showResults = selected || showDrillDown;
  return /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      minHeight: 300
    } : {
      display: "flex",
      gap: 16,
      minHeight: 400
    }
  }, (!isMobile || !showResults) && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {} : {
      width: 260,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: search,
    onChange: setSearch,
    placeholder: "搜尋歌手（繁簡皆可）…"
  }), /*#__PURE__*/React.createElement(NameList, {
    entries: filtered,
    onSelect: handleSelect,
    selected: selected
  })), showResults && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      marginTop: 0
    } : {
      flex: 1,
      minWidth: 0
    }
  }, isMobile && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSelected(null);
      nav.clear();
    },
    style: backBtnStyle
  }, "← 返回列表"), showDrillDown ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Breadcrumb, {
    stack: nav.stack,
    onNavigate: idx => nav.navigateTo(idx)
  }), /*#__PURE__*/React.createElement(DrillDownView, {
    type: nav.current.type,
    name: nav.current.name,
    data: data,
    index: index,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, selected && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      color: C.textMid,
      fontSize: 13
    }
  }, selected, "：", songs.length, " 首粵語作品"), /*#__PURE__*/React.createElement(SongTable, {
    songs: songs,
    data: data,
    showSinger: false,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  }))));
}

// ============================================================
// Tab: 按作曲
// ============================================================
function TabComposer({
  data,
  index,
  jumpTo,
  clearJump
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const nav = useNavStack();
  const isMobile = useIsMobile();
  useEffect(() => {
    if (jumpTo && jumpTo.name && index.composers[jumpTo.name]) {
      setSelected(jumpTo.name);
      nav.clear();
      if (clearJump) clearJump();
    }
  }, [jumpTo]);
  const filtered = useMemo(() => {
    const all = sortedEntries(index.composers);
    if (!search.trim()) return all;
    return all.filter(([name]) => matchQuery(name, search.trim()));
  }, [index.composers, search]);
  const songs = selected ? index.composers[selected] : null;
  const handleSelect = name => {
    setSelected(name);
    nav.clear();
    writeHash({
      tab: "composer",
      c: name
    });
  };
  const handleClickSinger = name => {
    if (index.singers[name]) {
      if (nav.stack.length === 0 && selected) {
        nav.push("composer", selected);
      }
      nav.push("singer", name);
    }
  };
  const handleClickComposer = name => {
    if (index.composers[name]) {
      nav.push("composer", name);
    }
  };
  const handleClickYear = year => {
    if (index.years[year]) {
      if (nav.stack.length === 0 && selected) {
        nav.push("composer", selected);
      }
      nav.push("year", String(year));
    }
  };
  const showDrillDown = nav.current !== null;
  const showResults = selected || showDrillDown;
  return /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      minHeight: 300
    } : {
      display: "flex",
      gap: 16,
      minHeight: 400
    }
  }, (!isMobile || !showResults) && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {} : {
      width: 260,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: search,
    onChange: setSearch,
    placeholder: "搜尋作曲人（繁簡皆可）…"
  }), /*#__PURE__*/React.createElement(NameList, {
    entries: filtered,
    onSelect: handleSelect,
    selected: selected
  })), showResults && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      marginTop: 0
    } : {
      flex: 1,
      minWidth: 0
    }
  }, isMobile && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSelected(null);
      nav.clear();
    },
    style: backBtnStyle
  }, "← 返回列表"), showDrillDown ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Breadcrumb, {
    stack: nav.stack,
    onNavigate: idx => nav.navigateTo(idx)
  }), /*#__PURE__*/React.createElement(DrillDownView, {
    type: nav.current.type,
    name: nav.current.name,
    data: data,
    index: index,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, selected && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      color: C.textMid,
      fontSize: 13
    }
  }, selected, "：與林夕合作 ", songs.length, " 首"), /*#__PURE__*/React.createElement(SongTable, {
    songs: songs,
    data: data,
    showComposer: false,
    onClickSinger: handleClickSinger,
    onClickYear: handleClickYear
  }))));
}

// ============================================================
// Tab: 按年份
// ============================================================
function TabYear({
  data,
  index
}) {
  const [selected, setSelected] = useState(null);
  const nav = useNavStack();
  const isMobile = useIsMobile();
  const yearList = useMemo(() => Object.entries(index.years).map(([y, ids]) => [Number(y), ids]).sort((a, b) => b[0] - a[0]), [index.years]);
  const songs = selected !== null ? index.years[selected] : null;
  const handleSelect = year => {
    setSelected(year);
    nav.clear();
  };
  const handleClickSinger = name => {
    if (index.singers[name]) {
      if (nav.stack.length === 0 && selected !== null) {
        nav.push("year", String(selected));
      }
      nav.push("singer", name);
    }
  };
  const handleClickComposer = name => {
    if (index.composers[name]) {
      if (nav.stack.length === 0 && selected !== null) {
        nav.push("year", String(selected));
      }
      nav.push("composer", name);
    }
  };
  const handleClickYear = year => {
    if (index.years[year]) {
      nav.push("year", String(year));
    }
  };
  const showDrillDown = nav.current !== null;
  const showResults = selected !== null || showDrillDown;
  return /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      minHeight: 300
    } : {
      display: "flex",
      gap: 16,
      minHeight: 400
    }
  }, (!isMobile || !showResults) && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {} : {
      width: 200,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: isMobile ? 320 : 480,
      overflowY: "auto",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white
    }
  }, yearList.map(([year, ids]) => {
    const isActive = selected === year;
    return /*#__PURE__*/React.createElement("div", {
      key: year,
      onClick: () => handleSelect(year),
      style: {
        padding: "9px 14px",
        cursor: "pointer",
        background: isActive ? C.card : "transparent",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      },
      onMouseEnter: e => {
        if (!isActive) e.currentTarget.style.background = C.cardHover;
      },
      onMouseLeave: e => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.text,
        fontSize: 14,
        fontWeight: 500
      }
    }, year), /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textLight,
        fontSize: 12
      }
    }, ids.length, " 首"));
  }))), showResults && /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {
      marginTop: 0
    } : {
      flex: 1,
      minWidth: 0
    }
  }, isMobile && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSelected(null);
      nav.clear();
    },
    style: backBtnStyle
  }, "← 返回列表"), showDrillDown ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Breadcrumb, {
    stack: nav.stack,
    onNavigate: idx => nav.navigateTo(idx)
  }), /*#__PURE__*/React.createElement(DrillDownView, {
    type: nav.current.type,
    name: nav.current.name,
    data: data,
    index: index,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, selected !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      color: C.textMid,
      fontSize: 13
    }
  }, selected, " 年：", songs.length, " 首作品"), /*#__PURE__*/React.createElement(SongTable, {
    songs: songs,
    data: data,
    showYear: false,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer
  }))));
}

// ============================================================
// Pill Selector
// ============================================================
function PillSelector({
  items,
  selected,
  onSelect,
  index
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const COLLAPSE_COUNT = 15;
  const shouldCollapse = isMobile && items.length > COLLAPSE_COUNT && !expanded;
  const visible = shouldCollapse ? items.slice(0, COLLAPSE_COUNT) : items;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8
    }
  }, visible.map(name => {
    const isActive = selected === name;
    const count = index[name] ? index[name].length : 0;
    return /*#__PURE__*/React.createElement("button", {
      key: name,
      onClick: () => onSelect(isActive ? null : name),
      style: {
        padding: "5px 12px",
        borderRadius: 16,
        border: "none",
        background: isActive ? C.pillActive : C.pillBg,
        color: isActive ? C.pillActiveText : C.text,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .15s",
        fontWeight: isActive ? 600 : 400,
        whiteSpace: "nowrap"
      }
    }, name, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        marginLeft: 4,
        opacity: 0.7
      }
    }, count));
  }), shouldCollapse && /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpanded(true),
    style: {
      padding: "5px 12px",
      borderRadius: 16,
      border: `1px dashed ${C.border}`,
      background: "transparent",
      color: C.textMid,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, "展開全部 (", items.length, ")")), isMobile && expanded && items.length > COLLAPSE_COUNT && /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpanded(false),
    style: {
      background: "none",
      border: "none",
      color: C.textLight,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      marginBottom: 8
    }
  }, "收起 ▲"));
}
function MiniTab({
  active,
  onClick,
  label
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      padding: "3px 10px",
      borderRadius: 12,
      border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? C.accent : "transparent",
      color: active ? C.white : C.textMid,
      fontSize: 11,
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: active ? 600 : 400
    }
  }, label);
}

// ============================================================
// Tab: 交叉查詢
// ============================================================
function TabCross({
  data,
  index
}) {
  const [singer, setSinger] = useState(null);
  const [composer, setComposer] = useState(null);
  const [singerQ, setSingerQ] = useState("");
  const [composerQ, setComposerQ] = useState("");
  const [singerMode, setSingerMode] = useState("hot");
  const [composerMode, setComposerMode] = useState("hot");
  const nav = useNavStack();
  const otherSingers = useMemo(() => sortedEntries(index.singers).filter(([name]) => !HOT_SINGERS.includes(name)), [index.singers]);
  const otherComposers = useMemo(() => sortedEntries(index.composers).filter(([name]) => !HOT_COMPOSERS.includes(name)), [index.composers]);
  const singerSearchResults = useMemo(() => {
    if (!singerQ.trim()) return otherSingers.slice(0, 30);
    return otherSingers.filter(([name]) => matchQuery(name, singerQ.trim())).slice(0, 30);
  }, [singerQ, otherSingers]);
  const composerSearchResults = useMemo(() => {
    if (!composerQ.trim()) return otherComposers.slice(0, 30);
    return otherComposers.filter(([name]) => matchQuery(name, composerQ.trim())).slice(0, 30);
  }, [composerQ, otherComposers]);
  const results = useMemo(() => {
    if (!singer && !composer) return null;
    const singerSet = singer ? new Set(index.singers[singer] || []) : null;
    const composerSet = composer ? new Set(index.composers[composer] || []) : null;
    if (singerSet && composerSet) return [...singerSet].filter(i => composerSet.has(i));
    if (singerSet) return [...singerSet];
    if (composerSet) return [...composerSet];
    return null;
  }, [singer, composer, index]);
  const selectSinger = name => {
    setSinger(name === singer ? null : name);
    setSingerQ(name || "");
    nav.clear();
  };
  const selectComposer = name => {
    setComposer(name === composer ? null : name);
    setComposerQ(name || "");
    nav.clear();
  };
  const clearSinger = () => {
    setSinger(null);
    setSingerQ("");
    nav.clear();
  };
  const clearComposer = () => {
    setComposer(null);
    setComposerQ("");
    nav.clear();
  };
  const handleClickSinger = name => {
    if (index.singers[name]) {
      if (nav.stack.length === 0) {
        const lbl = singer && composer ? `${singer} × ${composer}` : singer || composer || "";
        if (lbl) nav.push("cross", lbl);
      }
      nav.push("singer", name);
    }
  };
  const handleClickComposer = name => {
    if (index.composers[name]) {
      if (nav.stack.length === 0) {
        const lbl = singer && composer ? `${singer} × ${composer}` : singer || composer || "";
        if (lbl) nav.push("cross", lbl);
      }
      nav.push("composer", name);
    }
  };
  const handleClickYear = year => {
    if (index.years[year]) {
      if (nav.stack.length === 0) {
        const lbl = singer && composer ? `${singer} × ${composer}` : singer || composer || "";
        if (lbl) nav.push("cross", lbl);
      }
      nav.push("year", String(year));
    }
  };
  const showDrillDown = nav.current !== null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: C.textMid,
      fontWeight: 600
    }
  }, "歌手"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(MiniTab, {
    active: singerMode === "hot",
    onClick: () => setSingerMode("hot"),
    label: "常見歌手"
  }), /*#__PURE__*/React.createElement(MiniTab, {
    active: singerMode === "search",
    onClick: () => setSingerMode("search"),
    label: "其他歌手"
  })), singer && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 12,
      color: C.accent,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 4
    },
    onClick: clearSinger
  }, "已選：", /*#__PURE__*/React.createElement("strong", null, singer), " ✕")), singerMode === "hot" ? /*#__PURE__*/React.createElement(PillSelector, {
    items: HOT_SINGERS,
    selected: singer,
    onSelect: selectSinger,
    index: index.singers
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: singerQ,
    onChange: v => {
      setSingerQ(v);
      if (singer) setSinger(null);
      nav.clear();
    },
    placeholder: "搜尋其他歌手（繁簡皆可）…"
  }), !singer && singerQ.trim() && singerSearchResults.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 180,
      overflowY: "auto"
    }
  }, singerSearchResults.map(([name, ids]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    onClick: () => selectSinger(name),
    style: {
      padding: "7px 12px",
      cursor: "pointer",
      fontSize: 13,
      display: "flex",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.cardHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("span", null, name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight
    }
  }, ids.length)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: C.textMid,
      fontWeight: 600
    }
  }, "作曲人"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(MiniTab, {
    active: composerMode === "hot",
    onClick: () => setComposerMode("hot"),
    label: "常見作曲"
  }), /*#__PURE__*/React.createElement(MiniTab, {
    active: composerMode === "search",
    onClick: () => setComposerMode("search"),
    label: "其他作曲"
  })), composer && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 12,
      color: C.accent,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 4
    },
    onClick: clearComposer
  }, "已選：", /*#__PURE__*/React.createElement("strong", null, composer), " ✕")), composerMode === "hot" ? /*#__PURE__*/React.createElement(PillSelector, {
    items: HOT_COMPOSERS,
    selected: composer,
    onSelect: selectComposer,
    index: index.composers
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: composerQ,
    onChange: v => {
      setComposerQ(v);
      if (composer) setComposer(null);
      nav.clear();
    },
    placeholder: "搜尋其他作曲人（繁簡皆可）…"
  }), !composer && composerQ.trim() && composerSearchResults.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 180,
      overflowY: "auto"
    }
  }, composerSearchResults.map(([name, ids]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    onClick: () => selectComposer(name),
    style: {
      padding: "7px 12px",
      cursor: "pointer",
      fontSize: 13,
      display: "flex",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.cardHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("span", null, name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight
    }
  }, ids.length)))))), showDrillDown ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Breadcrumb, {
    stack: nav.stack,
    onNavigate: idx => nav.navigateTo(idx)
  }), /*#__PURE__*/React.createElement(DrillDownView, {
    type: nav.current.type,
    name: nav.current.name,
    data: data,
    index: index,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, results && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      color: C.textMid,
      fontSize: 13
    }
  }, singer && composer ? `${singer} × ${composer}：${results.length} 首合作` : singer ? `${singer}：${results.length} 首` : `${composer}：${results.length} 首`), /*#__PURE__*/React.createElement(SongTable, {
    songs: results,
    data: data,
    onClickSinger: handleClickSinger,
    onClickComposer: handleClickComposer,
    onClickYear: handleClickYear
  })));
}

// ============================================================
// Tab: 歌手對比
// ============================================================
function TabCompare({
  data,
  index
}) {
  const [singerA, setSingerA] = useState(null);
  const [singerB, setSingerB] = useState(null);
  const [qA, setQA] = useState("");
  const [qB, setQB] = useState("");
  const [modeA, setModeA] = useState("hot");
  const [modeB, setModeB] = useState("hot");
  const isMobile = useIsMobile();
  const otherSingers = useMemo(() => sortedEntries(index.singers).filter(([name]) => !HOT_SINGERS.includes(name)), [index.singers]);
  const searchA = useMemo(() => {
    if (!qA.trim()) return otherSingers.slice(0, 20);
    return otherSingers.filter(([n]) => matchQuery(n, qA.trim())).slice(0, 20);
  }, [qA, otherSingers]);
  const searchB = useMemo(() => {
    if (!qB.trim()) return otherSingers.slice(0, 20);
    return otherSingers.filter(([n]) => matchQuery(n, qB.trim())).slice(0, 20);
  }, [qB, otherSingers]);
  const pickA = name => {
    setSingerA(name === singerA ? null : name);
    setQA(name || "");
  };
  const pickB = name => {
    setSingerB(name === singerB ? null : name);
    setQB(name || "");
  };
  const comparison = useMemo(() => {
    if (!singerA || !singerB) return null;
    const songsA = index.singers[singerA] || [];
    const songsB = index.singers[singerB] || [];

    // Get composers for each
    const composersA = {};
    songsA.forEach(i => {
      const c = data[i].c;
      if (c) composersA[c] = (composersA[c] || 0) + 1;
    });
    const composersB = {};
    songsB.forEach(i => {
      const c = data[i].c;
      if (c) composersB[c] = (composersB[c] || 0) + 1;
    });

    // Find shared
    const shared = Object.keys(composersA).filter(c => composersB[c]);
    const onlyA = Object.keys(composersA).filter(c => !composersB[c]);
    const onlyB = Object.keys(composersB).filter(c => !composersA[c]);

    // Sort shared by total count
    shared.sort((a, b) => composersA[b] + composersB[b] - (composersA[a] + composersB[a]));
    onlyA.sort((a, b) => composersA[b] - composersA[a]);
    onlyB.sort((a, b) => composersB[b] - composersB[a]);
    return {
      songsA,
      songsB,
      composersA,
      composersB,
      shared,
      onlyA,
      onlyB
    };
  }, [singerA, singerB, index, data]);
  const renderPicker = (label, singer, setSinger, q, setQ, mode, setMode, searchResults, pick) => /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: C.textMid,
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(MiniTab, {
    active: mode === "hot",
    onClick: () => setMode("hot"),
    label: "常見"
  }), /*#__PURE__*/React.createElement(MiniTab, {
    active: mode === "search",
    onClick: () => setMode("search"),
    label: "其他"
  })), singer && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: 12,
      color: C.accent,
      cursor: "pointer"
    },
    onClick: () => {
      setSinger(null);
      setQ("");
    }
  }, /*#__PURE__*/React.createElement("strong", null, singer), " ✕")), mode === "hot" ? /*#__PURE__*/React.createElement(PillSelector, {
    items: HOT_SINGERS,
    selected: singer,
    onSelect: pick,
    index: index.singers
  }) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: v => {
      setQ(v);
      if (singer) setSinger(null);
    },
    placeholder: "搜尋歌手…"
  }), !singer && q.trim() && searchResults.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 150,
      overflowY: "auto"
    }
  }, searchResults.map(([name, ids]) => /*#__PURE__*/React.createElement("div", {
    key: name,
    onClick: () => pick(name),
    style: {
      padding: "7px 12px",
      cursor: "pointer",
      fontSize: 13,
      display: "flex",
      justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.cardHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("span", null, name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight
    }
  }, ids.length))))));
  return /*#__PURE__*/React.createElement("div", null, renderPicker("歌手 A", singerA, setSingerA, qA, setQA, modeA, setModeA, searchA, pickA), renderPicker("歌手 B", singerB, setSingerB, qB, setQB, modeB, setModeB, searchB, pickB), comparison && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16,
      padding: 14,
      background: C.card,
      borderRadius: 8,
      fontSize: 13,
      color: C.textMid
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: C.text
    }
  }, singerA), "（", comparison.songsA.length, " 首）vs ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: C.text
    }
  }, singerB), "（", comparison.songsB.length, " 首）"), comparison.shared.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: C.text,
      marginBottom: 8
    }
  }, "共同作曲人（", comparison.shared.length, "）"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 300,
      overflowY: "auto"
    }
  }, comparison.shared.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      padding: "8px 12px",
      borderBottom: `1px solid ${C.border}`,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      color: C.text
    }
  }, c), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.pink,
      fontWeight: 500
    }
  }, singerA.slice(0, 2), " ", comparison.composersA[c]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.blue,
      fontWeight: 500
    }
  }, singerB.slice(0, 2), " ", comparison.composersB[c]))))), /*#__PURE__*/React.createElement("div", {
    style: isMobile ? {} : {
      display: "flex",
      gap: 16
    }
  }, comparison.onlyA.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: C.pink,
      marginBottom: 8
    }
  }, "僅 ", singerA, "（", comparison.onlyA.length, "）"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 200,
      overflowY: "auto"
    }
  }, comparison.onlyA.slice(0, 30).map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      padding: "6px 12px",
      borderBottom: `1px solid ${C.border}`,
      fontSize: 12,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.text
    }
  }, c), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight
    }
  }, comparison.composersA[c]))), comparison.onlyA.length > 30 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      textAlign: "center",
      color: C.textLight,
      fontSize: 11
    }
  }, "…及其他 ", comparison.onlyA.length - 30, " 位"))), comparison.onlyB.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: C.blue,
      marginBottom: 8
    }
  }, "僅 ", singerB, "（", comparison.onlyB.length, "）"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white,
      maxHeight: 200,
      overflowY: "auto"
    }
  }, comparison.onlyB.slice(0, 30).map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      padding: "6px 12px",
      borderBottom: `1px solid ${C.border}`,
      fontSize: 12,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.text
    }
  }, c), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight
    }
  }, comparison.composersB[c]))), comparison.onlyB.length > 30 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      textAlign: "center",
      color: C.textLight,
      fontSize: 11
    }
  }, "…及其他 ", comparison.onlyB.length - 30, " 位"))))));
}

// ============================================================
// Tab: 統計 (with clickable names)
// ============================================================
function TabStats({
  data,
  index,
  onNavigate
}) {
  const topSingers = useMemo(() => sortedEntries(index.singers).slice(0, 20), [index.singers]);
  const topComposers = useMemo(() => sortedEntries(index.composers).slice(0, 20), [index.composers]);
  const yearData = useMemo(() => Object.entries(index.years).map(([y, ids]) => ({
    year: Number(y),
    count: ids.length
  })).sort((a, b) => a.year - b.year), [index.years]);
  const maxYear = Math.max(...yearData.map(d => d.count));
  const sourceStats = useMemo(() => {
    const counts = {};
    data.forEach(s => {
      if (s.r) counts[s.r] = (counts[s.r] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: sectionTitle
  }, "年度產量"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 2,
      height: 140,
      padding: "0 4px",
      minWidth: yearData.length * 18
    }
  }, yearData.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.year,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flex: "0 0 auto",
      width: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: Math.max(2, d.count / maxYear * 110),
      background: C.accent,
      borderRadius: "3px 3px 0 0"
    },
    title: `${d.year}: ${d.count} 首`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.textLight,
      marginTop: 3,
      transform: "rotate(-60deg)",
      transformOrigin: "top center",
      whiteSpace: "nowrap"
    }
  }, d.year % 5 === 0 ? d.year : "")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: sectionTitle
  }, "歌手 Top 20"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white
    }
  }, topSingers.map(([name, ids], i) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 12px",
      borderBottom: `1px solid ${C.border}`,
      cursor: onNavigate ? "pointer" : "default"
    },
    onClick: () => onNavigate && onNavigate("singer", name)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight,
      fontSize: 11,
      width: 20,
      textAlign: "right"
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: onNavigate ? C.link : C.text
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.max(4, ids.length / topSingers[0][1].length * 120),
      height: 8,
      background: C.pink,
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.textMid,
      width: 30,
      textAlign: "right"
    }
  }, ids.length))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: sectionTitle
  }, "作曲人 Top 20"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      background: C.white
    }
  }, topComposers.map(([name, ids], i) => /*#__PURE__*/React.createElement("div", {
    key: name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 12px",
      borderBottom: `1px solid ${C.border}`,
      cursor: onNavigate ? "pointer" : "default"
    },
    onClick: () => onNavigate && onNavigate("composer", name)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textLight,
      fontSize: 11,
      width: 20,
      textAlign: "right"
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: onNavigate ? C.link : C.text
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      width: Math.max(4, ids.length / topComposers[0][1].length * 120),
      height: 8,
      background: C.blue,
      borderRadius: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.textMid,
      width: 30,
      textAlign: "right"
    }
  }, ids.length)))))), sourceStats.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: sectionTitle
  }, "外國作曲來源"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap"
    }
  }, sourceStats.map(([key, count]) => {
    const info = SOURCE_LABELS[key] || {
      label: key,
      color: C.tag
    };
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        padding: "10px 16px",
        borderRadius: 8,
        background: info.color,
        color: C.tagText,
        fontSize: 13,
        textAlign: "center",
        minWidth: 80
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 600,
        marginBottom: 2
      }
    }, count), /*#__PURE__*/React.createElement("div", null, info.label));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      padding: 16,
      background: C.card,
      borderRadius: 8,
      fontSize: 12,
      color: C.textMid,
      lineHeight: 1.6
    }
  }, "數據覆蓋 1985–2026 年，共 ", data.length, " 首粵語作品 · ", Object.keys(index.singers).length, " 位歌手 · ", Object.keys(index.composers).length, " 組作曲 credits"));
}
const sectionTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: C.text,
  marginBottom: 10,
  paddingBottom: 6,
  borderBottom: `1px solid ${C.border}`
};

// ============================================================
// Global Search
// ============================================================
function GlobalSearch({
  data,
  onNavigate
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    return data.map((s, i) => ({
      ...s,
      i
    })).filter(s => matchQuery(s.t, q.trim()) || matchQuery(s.s, q.trim()) || matchQuery(s.c, q.trim())).slice(0, 30);
  }, [q, data]);
  const handleClick = song => {
    setOpen(false);
    setQ("");
    if (onNavigate) onNavigate("singer", song.s);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: v => {
      setQ(v);
      setOpen(true);
    },
    placeholder: "搜尋歌名 / 歌手 / 作曲人（繁簡皆可）…"
  }), open && results.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      zIndex: 20,
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      boxShadow: `0 8px 24px ${C.shadow}`,
      maxHeight: 300,
      overflowY: "auto"
    }
  }, results.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.i,
    onClick: () => handleClick(s),
    style: {
      padding: "8px 14px",
      borderBottom: `1px solid ${C.border}`,
      cursor: "pointer",
      fontSize: 13
    },
    onMouseEnter: e => e.currentTarget.style.background = C.cardHover,
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.text,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Highlight, {
    text: s.t,
    query: q.trim()
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.textMid,
      fontSize: 12,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(Highlight, {
    text: s.s,
    query: q.trim()
  }), " · ", s.y, s.c ? /*#__PURE__*/React.createElement(React.Fragment, null, " · 曲：", /*#__PURE__*/React.createElement(Highlight, {
    text: s.c,
    query: q.trim()
  })) : "", s.r && SOURCE_LABELS[s.r] && /*#__PURE__*/React.createElement(Tag, {
    label: SOURCE_LABELS[s.r].label,
    color: SOURCE_LABELS[s.r].color
  }))))), open && q.trim() && results.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      zIndex: 20,
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: 16,
      textAlign: "center",
      color: C.textLight,
      fontSize: 13
    }
  }, "無相關結果"));
}

// ============================================================
// Splash Image (base64 embedded)
// ============================================================
const SPLASH_IMG = "data:image/jpeg;base64,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";

// ============================================================
// Welcome Splash + Guide Modal
// ============================================================
const GUIDE_SECTIONS = [{
  icon: "⌕",
  title: "全局搜索",
  desc: "頂部搜索框可按歌名、歌手、作曲人搜索，支持簡體輸入。點擊結果跳轉至該歌手頁面"
}, {
  icon: "🎤",
  title: "按歌手",
  desc: "選擇歌手，查看其所有粵語作品及作曲 credits"
}, {
  icon: "🎹",
  title: "按作曲",
  desc: "選擇作曲人，查看其與林夕合作的全部歌曲"
}, {
  icon: "📅",
  title: "按年份",
  desc: "按年份瀏覽林夕每年的創作產量和合作對象"
}, {
  icon: "🔀",
  title: "交叉查詢",
  desc: "同時選擇歌手和作曲人，查看特定搭檔的合作歌曲"
}, {
  icon: "⚖️",
  title: "歌手對比",
  desc: "選兩位歌手，對比共同作曲人和各自獨有的作曲人"
}, {
  icon: "📊",
  title: "統計",
  desc: "排行榜（可點擊跳轉）、年度產量圖表、外國作曲來源"
}, {
  icon: "🔗",
  title: "交叉導航",
  desc: "歌曲列表中歌手名、作曲人名、年份均可點擊跳轉，面包屑可回退"
}];
function GuideModal({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(74,70,64,0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: 16,
      maxWidth: 480,
      width: "100%",
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(74,70,64,0.3)",
      padding: 0
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      borderRadius: "16px 16px 0 0",
      overflow: "hidden",
      background: "#e8e2d8"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: SPLASH_IMG,
    alt: "林夕",
    style: {
      width: "100%",
      display: "block",
      objectFit: "contain"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px 8px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: C.text,
      margin: 0
    }
  }, "林夕粵語填詞作品"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.textMid,
      marginTop: 4
    }
  }, "2764 首 · 1985–2026 · Credits 查詢")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 24px 16px"
    }
  }, GUIDE_SECTIONS.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: i < GUIDE_SECTIONS.length - 1 ? `1px solid ${C.border}` : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      flexShrink: 0,
      width: 28,
      textAlign: "center"
    }
  }, s.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: C.text,
      marginBottom: 2
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textMid,
      lineHeight: 1.5
    }
  }, s.desc))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 24px 20px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      padding: "10px 40px",
      borderRadius: 20,
      border: "none",
      background: C.accent,
      color: C.white,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, "開始使用"))));
}

// ============================================================
// App
// ============================================================
const GUIDE_SEEN_KEY = "linxi-guide-seen";

// ============================================================
// URL Hash Routing
// ============================================================
function parseHash() {
  try {
    const h = window.location.hash.slice(1); // remove #
    if (!h) return {};
    const params = {};
    h.split("&").forEach(part => {
      const [k, v] = part.split("=");
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    return params;
  } catch (e) {
    return {};
  }
}
function writeHash(params) {
  try {
    const parts = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    const h = parts.join("&");
    if (window.location.hash.slice(1) !== h) {
      window.history.replaceState(null, "", h ? `#${h}` : window.location.pathname);
    }
  } catch (e) {}
}
function App() {
  // Init tab from hash
  const initHash = useMemo(() => parseHash(), []);
  const validTabs = TABS.map(t => t.id);
  const [tab, setTab] = useState(() => {
    return initHash.tab && validTabs.includes(initHash.tab) ? initHash.tab : "singer";
  });
  const data = useMemo(() => DATA, []);
  const index = useMemo(() => buildIndex(data), [data]);

  // Jump-to: from hash, GlobalSearch, or Stats
  const [jumpTo, setJumpTo] = useState(() => {
    if (initHash.s && (initHash.tab === "singer" || !initHash.tab)) return {
      type: "singer",
      name: initHash.s
    };
    if (initHash.c && initHash.tab === "composer") return {
      type: "composer",
      name: initHash.c
    };
    return null;
  });
  const handleGlobalNavigate = useCallback((type, name) => {
    if (type === "singer" || type === "composer") {
      setTab(type);
      setJumpTo({
        type,
        name
      });
    }
  }, []);

  // Write hash when tab changes
  useEffect(() => {
    writeHash({
      tab
    });
  }, [tab]);

  // Guide modal: show on first visit, remember dismissal
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return !localStorage.getItem(GUIDE_SEEN_KEY);
    } catch (e) {
      return true;
    }
  });
  const closeGuide = useCallback(() => {
    setShowGuide(false);
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch (e) {}
  }, []);
  const openGuide = useCallback(() => setShowGuide(true), []);
  const [isDark, toggleTheme, themeKey] = useTheme();
  if (data.length === 0) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center",
      color: C.textMid
    }
  }, "載入中…");
  return /*#__PURE__*/React.createElement("div", {
    key: themeKey,
    style: {
      maxWidth: 960,
      margin: "0 auto",
      padding: "24px 20px",
      fontFamily: "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', -apple-system, sans-serif",
      color: C.text,
      background: C.bg,
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: C.text,
      margin: 0,
      letterSpacing: 1
    }
  }, "林夕粵語填詞作品"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textLight,
      marginTop: 4
    }
  }, data.length, " 首 · 1985–2026 · Credits 查詢")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: toggleTheme,
    title: isDark ? "淺色模式" : "深色模式",
    style: {
      background: "none",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      color: C.textMid,
      fontSize: 15,
      fontFamily: "inherit",
      transition: "all .15s",
      lineHeight: 1
    }
  }, isDark ? "☀️" : "🌙"), /*#__PURE__*/React.createElement("button", {
    onClick: openGuide,
    title: "使用指南",
    style: {
      background: "none",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      color: C.textMid,
      fontSize: 13,
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 4,
      transition: "all .15s"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, "?"), /*#__PURE__*/React.createElement("span", null, "指南")))), /*#__PURE__*/React.createElement(GlobalSearch, {
    data: data,
    onNavigate: handleGlobalNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      borderBottom: `2px solid ${C.border}`,
      marginBottom: 20,
      overflowX: "auto"
    }
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      padding: "10px 18px",
      background: "none",
      border: "none",
      borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
      marginBottom: -2,
      color: tab === t.id ? C.text : C.textLight,
      fontWeight: tab === t.id ? 600 : 400,
      fontSize: 14,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all .15s",
      whiteSpace: "nowrap"
    }
  }, t.label))), tab === "singer" && /*#__PURE__*/React.createElement(TabSinger, {
    data: data,
    index: index,
    jumpTo: jumpTo && jumpTo.type === "singer" ? jumpTo : null,
    clearJump: () => setJumpTo(null)
  }), tab === "composer" && /*#__PURE__*/React.createElement(TabComposer, {
    data: data,
    index: index,
    jumpTo: jumpTo && jumpTo.type === "composer" ? jumpTo : null,
    clearJump: () => setJumpTo(null)
  }), tab === "year" && /*#__PURE__*/React.createElement(TabYear, {
    data: data,
    index: index
  }), tab === "cross" && /*#__PURE__*/React.createElement(TabCross, {
    data: data,
    index: index
  }), tab === "compare" && /*#__PURE__*/React.createElement(TabCompare, {
    data: data,
    index: index
  }), tab === "stats" && /*#__PURE__*/React.createElement(TabStats, {
    data: data,
    index: index,
    onNavigate: handleGlobalNavigate
  }), showGuide && /*#__PURE__*/React.createElement(GuideModal, {
    onClose: closeGuide
  }));
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
