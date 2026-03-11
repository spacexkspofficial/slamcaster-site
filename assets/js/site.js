document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("js-ready");
  initNavigation();
  markCurrentPage();
  initCookieBanner();
  initRevealAnimations();
  initTableOfContents();
  initComicsArchive();
});

function initNavigation() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function markCurrentPage() {
  const current = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function initCookieBanner() {
  const choice = getStoredCookieChoice();

  if (choice) {
    updateConsent(choice);
    return;
  }

  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <p>
      This site uses cookies for analytics and advertising. By continuing, you agree to our
      <a href="privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      and
      <a href="terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
    </p>
    <div class="cookie-actions">
      <button class="button" type="button" data-cookie-choice="accepted">Accept</button>
      <button class="button secondary" type="button" data-cookie-choice="rejected">Reject</button>
    </div>
  `;

  banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-cookie-choice");
      setStoredCookieChoice(value);
      updateConsent(value);
      banner.remove();
    });
  });

  document.body.appendChild(banner);
}

function getStoredCookieChoice() {
  try {
    return window.localStorage.getItem("cookiesChoice");
  } catch (error) {
    return null;
  }
}

function setStoredCookieChoice(value) {
  try {
    window.localStorage.setItem("cookiesChoice", value);
  } catch (error) {
    // Ignore localStorage failures.
  }
}

function updateConsent(choice) {
  if (typeof window.gtag !== "function") {
    return;
  }

  const storageValue = choice === "accepted" ? "granted" : "denied";

  window.gtag("consent", "update", {
    ad_storage: storageValue,
    analytics_storage: storageValue
  });
}

window.captureOutboundLink = function captureOutboundLink(url) {
  if (typeof window.gtag !== "function") {
    window.location.href = url;
    return false;
  }

  let completed = false;
  const go = () => {
    if (completed) {
      return;
    }

    completed = true;
    window.location.href = url;
  };

  window.gtag("event", "click", {
    event_category: "outbound",
    event_label: url,
    transport_type: "beacon",
    event_callback: go
  });

  window.setTimeout(go, 450);
  return false;
};

function initRevealAnimations() {
  const items = document.querySelectorAll("[data-reveal]");

  if (!items.length) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initTableOfContents() {
  document.querySelectorAll("[data-toc-root]").forEach((root) => {
    const list = root.querySelector("[data-toc]");
    const content = root.querySelector("[data-toc-content]");

    if (!list || !content) {
      return;
    }

    const levels = list.getAttribute("data-toc-levels") || "h2";
    const headings = Array.from(content.querySelectorAll(levels));

    if (!headings.length) {
      const card = list.closest(".toc-card");
      if (card) {
        card.hidden = true;
      }
      return;
    }

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = slugify(heading.textContent || "", index + 1);
      }

      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();

      if (heading.tagName === "H3") {
        link.classList.add("toc-sub");
      }

      list.appendChild(link);
    });
  });
}

function slugify(text, fallbackIndex) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || `section-${fallbackIndex}`;
}

function initComicsArchive() {
  const archive = document.querySelector("[data-comics-archive]");

  if (!archive) {
    return;
  }

  const cards = Array.from(archive.querySelectorAll(".comic-card"));
  const search = archive.querySelector("[data-comic-search]");
  const count = archive.querySelector("[data-comic-count]");
  const emptyState = archive.querySelector("[data-empty-state]");
  const expandAll = archive.querySelector("[data-expand-all]");
  const collapseAll = archive.querySelector("[data-collapse-all]");

  cards.forEach((card, index) => {
    const toggle = card.querySelector("[data-comic-toggle]");
    const panel = card.querySelector(".comic-panel");

    if (!toggle || !panel) {
      return;
    }

    const panelId = panel.id || `comic-panel-${index + 1}`;
    panel.id = panelId;
    toggle.setAttribute("aria-controls", panelId);
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";
      setComicOpenState(card, willOpen);
    });
  });

  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach((card) => {
        const title = (card.getAttribute("data-title") || "").toLowerCase();
        const matches = !query || title.includes(query);

        card.hidden = !matches;
        if (matches) {
          visibleCount += 1;
        } else {
          setComicOpenState(card, false);
        }
      });

      updateComicCount(count, visibleCount);

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }
    });
  }

  if (expandAll) {
    expandAll.addEventListener("click", () => {
      cards.forEach((card) => {
        if (!card.hidden) {
          setComicOpenState(card, true);
        }
      });
    });
  }

  if (collapseAll) {
    collapseAll.addEventListener("click", () => {
      cards.forEach((card) => setComicOpenState(card, false));
    });
  }

  updateComicCount(count, cards.length);
}

function setComicOpenState(card, isOpen) {
  const toggle = card.querySelector("[data-comic-toggle]");

  card.classList.toggle("is-open", isOpen);

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(isOpen));
  }
}

function updateComicCount(countElement, total) {
  if (!countElement) {
    return;
  }

  countElement.textContent = `${total} comic${total === 1 ? "" : "s"}`;
}
