import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as api from "./api.js";
import { childrenFrom, postFrom } from "./models.js";
import { usePaged } from "./hooks.js";
import { Header, More, Post } from "./ui.jsx";
import Viewer from "./Viewer.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Timeline, { TimelineDetail } from "./pages/Timeline.jsx";
import Mine from "./pages/Mine.jsx";
import Publish from "./pages/Publish.jsx";
import BookEditor from "./pages/BookEditor.jsx";
import { Address, AddBaby, AssociateParent } from "./pages/Forms.jsx";
import {
  Food,
  Tasks,
  Task,
  Album,
  Growth,
  Book,
  Orders,
} from "./pages/Collections.jsx";
import {
  Babies,
  Baby,
  Friends,
  Messages,
  Settings,
  Profile,
  Addresses,
  Feedback,
  Help,
  About,
  School,
} from "./pages/Account.jsx";
import { Attendance, Classroom } from "./pages/School.jsx";
function readRoute() {
  const [path, search = ""] = location.hash.slice(1).split("?");
  return {
    name: path.replace(/^\//, "") || "home",
    params: Object.fromEntries(new URLSearchParams(search)),
  };
}
function Records({ kind, child, onBack, navigate, onView }) {
  const type = {
    audio: "home_voice",
    events: "home_note",
    diary: "home_diary",
  }[kind];
  const state = usePaged(
    (cursor) =>
      api.timeline("family", child, cursor, "all", { dataFrom: type }),
    [child.id, kind],
  );
  return (
    <>
      <Header
        title={{ audio: "童言童语", events: "大事记", diary: "日记" }[kind]}
        onBack={onBack}
      />
      {state.rows.map((row) => (
        <Post
          key={row.id}
          post={postFrom(row)}
          family
          onView={onView}
          onDetail={() => navigate("detail", { id: row.id, circle: "family" })}
        />
      ))}
      <More state={state} />
    </>
  );
}
export default function App() {
  const [session, setSession] = useState(api.hasSession()),
    [children, setChildren] = useState([]),
    [profile, setProfile] = useState(null),
    [childId, setChildId] = useState(
      sessionStorage.getItem("open-yuanbaotong.child") || "",
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [route, setRoute] = useState(readRoute),
    [view, setView] = useState(null),
    [message, setMessage] = useState("");
  const timer = useRef(),
    navigation = useRef(0),
    scrolls = useRef(new Map());
  const [visited, setVisited] = useState(() => [
    ["home", "timeline", "mine"].includes(readRoute().name)
      ? readRoute().name
      : "home",
  ]);
  const toast = useCallback((text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 4500);
  }, []);
  const logout = useCallback(() => {
    api.clearSession();
    setChildren([]);
    setProfile(null);
    setView(null);
    setSession(false);
    sessionStorage.removeItem("open-yuanbaotong.child");
    scrolls.current.clear();
  }, []);
  useEffect(() => {
    const changed = () => {
      const next = readRoute();
      setRoute(next);
      if (["home", "timeline", "mine"].includes(next.name))
        setVisited((old) =>
          old.includes(next.name) ? old : [...old, next.name],
        );
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const expired = () => {
      logout();
      toast("登录已过期，请重新登录");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [logout, toast]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api.familyBabies(), api.userInfo()])
      .then(([rows, user]) => {
        if (active) {
          setChildren(childrenFrom(rows));
          setProfile(user);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, retry]);
  const navigate = (name, params = {}) => {
    scrolls.current.set(route.name, window.scrollY);
    const next =
      "#/" +
      name +
      (Object.keys(params).length ? "?" + new URLSearchParams(params) : "");
    if (location.hash !== next) {
      navigation.current++;
      location.hash = next;
    }
  };
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo(0, scrolls.current.get(route.name) || 0),
    );
    return () => cancelAnimationFrame(frame);
  }, [route]);
  const onBack = () => {
    scrolls.current.set(route.name, window.scrollY);
    if (navigation.current > 0) {
      navigation.current--;
      history.back();
    } else navigate("home");
  };
  const onChild = (id) => {
    setChildId(id);
    sessionStorage.setItem("open-yuanbaotong.child", id);
    toast("已切换宝宝");
  };
  const child =
    children.find((c) => c.id === childId) ||
    children.find((c) => c.main) ||
    children[0];
  const onView = (media, selected) => setView({ media, selected });
  const { name, params } = route;
  const common = {
    child,
    children,
    profile,
    onChild,
    navigate,
    onBack,
    onView,
    toast,
    onLogout: logout,
    onUpdated: () => setRetry((v) => v + 1),
  };
  let page;
  if (["home", "timeline", "mine"].includes(name)) page = null;
  else
    switch (name) {
      case "publish":
        page = <Publish {...common} />;
        break;
      case "detail":
        page = (
          <TimelineDetail
            {...common}
            id={params.id}
            circle={params.circle || "class"}
          />
        );
        break;
      case "food":
      case "cookbook":
        page = <Food {...common} cookbook={name === "cookbook"} />;
        break;
      case "tasks":
        page = <Tasks {...common} />;
        break;
      case "task":
        page = (
          <Task
            {...common}
            id={params.id}
            template={params.template === "true"}
          />
        );
        break;
      case "album":
        page = <Album {...common} />;
        break;
      case "growth":
        page = <Growth {...common} />;
        break;
      case "book":
        page = <Book {...common} id={params.id} title={params.title} />;
        break;
      case "book-edit":
        page = <BookEditor {...common} id={params.id} title={params.title} />;
        break;
      case "orders":
        page = <Orders {...common} />;
        break;
      case "babies":
        page = <Babies {...common} />;
        break;
      case "baby":
        page = (
          <Baby
            key={params.id}
            {...common}
            baby={children.find((c) => c.id === params.id) || child}
          />
        );
        break;
      case "friends":
        page = <Friends {...common} />;
        break;
      case "messages":
      case "message":
        page = <Messages {...common} id={params.id} />;
        break;
      case "settings":
        page = <Settings {...common} />;
        break;
      case "profile":
        page = profile ? <Profile {...common} /> : null;
        break;
      case "address":
        page = <Address {...common} id={params.id} />;
        break;
      case "add-baby":
        page = <AddBaby {...common} />;
        break;
      case "associate-parent":
        page = <AssociateParent {...common} />;
        break;
      case "addresses":
        page = <Addresses {...common} />;
        break;
      case "feedback":
        page = <Feedback {...common} />;
        break;
      case "help":
        page = <Help {...common} />;
        break;
      case "about":
        page = <About {...common} />;
        break;
      case "school":
        page = <School {...common} />;
        break;
      case "attendance":
        page = <Attendance {...common} />;
        break;
      case "classroom":
        page = <Classroom {...common} />;
        break;
      case "audio":
      case "events":
      case "diary":
        page = <Records {...common} kind={name} />;
        break;
      default:
        page = (
          <>
            <Header title="页面不存在" onBack={onBack} />
            <p className="end-note">请返回家园重新打开</p>
          </>
        );
    }
  return (
    <>
      <main className="app">
        {!session ? (
          <Login
            onLogin={() => {
              setSession(true);
              navigate("home");
            }}
            toast={toast}
          />
        ) : loading ? (
          <div className="initial-loading" role="status">
            正在加载宝宝信息…
          </div>
        ) : error ? (
          <section className="account-error">
            <h1>宝宝信息加载失败</h1>
            <p role="alert">{error}</p>
            <button className="primary" onClick={() => setRetry((v) => v + 1)}>
              重新加载
            </button>
            <button className="text-button" onClick={logout}>
              退出登录
            </button>
          </section>
        ) : !child ? (
          <section className="account-error">
            <h1>暂无宝宝</h1>
            <p>当前账号没有关联宝宝。</p>
            <button className="text-button" onClick={logout}>
              退出登录
            </button>
          </section>
        ) : (
          <>
            {visited.map((key) => (
              <section key={key} hidden={key !== name}>
                {key === "home" ? (
                  <Home {...common} />
                ) : key === "timeline" ? (
                  <Timeline {...common} />
                ) : (
                  <Mine {...common} />
                )}
              </section>
            ))}
            {page}
            {["home", "timeline", "mine"].includes(name) && (
              <nav className="bottom-nav" aria-label="主导航">
                {[
                  ["home", "家园"],
                  ["timeline", "时光轴"],
                  ["mine", "我的"],
                ].map(([key, title]) => (
                  <button
                    key={key}
                    className={name === key ? "nav-active" : ""}
                    aria-current={name === key ? "page" : undefined}
                    onClick={() => navigate(key)}
                  >
                    <img
                      src={`/app-assets/tabs/tab_${key}_${name === key ? 1 : 0}.png`}
                      alt=""
                    />
                    {title}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </main>
      <Viewer view={view} onClose={() => setView(null)} toast={toast} />
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}
