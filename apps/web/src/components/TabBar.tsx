interface TabBarItem<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: Array<TabBarItem<T>>;
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = ""
}: TabBarProps<T>) {
  return (
    <div className={`tab-bar page-enter-delay-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={[
            "tab-item",
            activeTab === tab.id ? "tab-item-active" : "tab-item-inactive"
          ].join(" ")}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
