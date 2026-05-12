document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("js-ready");
  initNavigation();
  markCurrentPage();
  initCookieBanner();
  initRevealAnimations();
  initParallax();
  initLegalAccordion();
  initTableOfContents();
  initComicsArchive();
  initBehaviorTracking();
  openHashTarget();
  window.addEventListener("hashchange", openHashTarget);
});

function initParallax() {
  const layers = document.querySelectorAll("[data-parallax]");
  if (!layers.length) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallViewport = window.matchMedia("(max-width: 700px)");
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");

  const shouldDisable = () =>
    reducedMotion.matches || smallViewport.matches || coarsePointer.matches;

  let ticking = false;

  const reset = () => {
    layers.forEach((layer) => {
      layer.style.transform = "";
    });
  };

  const update = () => {
    if (shouldDisable()) {
      reset();
      ticking = false;
      return;
    }

    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.parallax) || 0.35;
      const host = layer.parentElement;
      if (!host) {
        return;
      }
      const rect = host.getBoundingClientRect();
      // Only animate while host is near the viewport — saves work off-screen.
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
        return;
      }
      const offset = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * speed;
      layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  const handlePrefChange = () => {
    if (shouldDisable()) {
      reset();
    } else {
      onScroll();
    }
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handlePrefChange);
    smallViewport.addEventListener("change", handlePrefChange);
  }

  update();
}

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
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.01,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initLegalAccordion() {
  document.querySelectorAll("[data-legal-accordion]").forEach((article) => {
    const sections = Array.from(article.querySelectorAll(":scope > section"));

    if (!sections.length) {
      return;
    }

    const initialOpen = Number(article.getAttribute("data-legal-initial-open") || 1);
    const toolbar = document.createElement("div");
    toolbar.className = "legal-toolbar";
    toolbar.innerHTML = `
      <div class="legal-toolbar-main">
        <p class="legal-toolbar-copy">Use the section list, search, or expand/collapse controls to read the Terms more comfortably.</p>
        <label class="search-field legal-search" for="legal-search">
          <span class="sr-only">Search terms of service sections</span>
          <input id="legal-search" type="search" placeholder="Search sections or keywords" data-legal-search />
        </label>
      </div>
      <div class="legal-toolbar-side">
        <span class="count-pill legal-count" data-legal-count></span>
        <div class="toolbar-actions legal-toolbar-actions">
          <button class="button secondary small" type="button" data-legal-expand>Expand All</button>
          <button class="button secondary small" type="button" data-legal-collapse>Collapse All</button>
        </div>
      </div>
    `;

    article.prepend(toolbar);

    sections.forEach((section, index) => {
      const primaryHeading = section.querySelector(":scope > h2, :scope > h3");
      const title = primaryHeading ? primaryHeading.textContent.trim() : index === 0 ? "Overview" : `Section ${index + 1}`;
      const level = primaryHeading ? primaryHeading.tagName.toLowerCase() : "h2";
      const anchorId = primaryHeading && primaryHeading.id ? primaryHeading.id : slugify(title, index + 1);
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const titleNode = document.createElement("span");
      const metaNode = document.createElement("span");
      const body = document.createElement("div");
      const itemCount = section.querySelectorAll("p, li").length;

      details.className = "legal-section";
      details.open = index < initialOpen;
      details.dataset.sectionTitle = title.toLowerCase();
      details.dataset.sectionBody = section.textContent.toLowerCase();

      summary.className = "legal-summary";

      titleNode.className = "legal-summary-title";
      titleNode.id = anchorId;
      titleNode.dataset.tocLabel = "true";
      titleNode.dataset.tocLevel = level;
      titleNode.textContent = title;

      metaNode.className = "legal-summary-meta";
      metaNode.textContent = `${itemCount} item${itemCount === 1 ? "" : "s"}`;

      summary.append(titleNode, metaNode);

      body.className = "legal-section-body";
      if (primaryHeading) {
        primaryHeading.remove();
      }
      while (section.firstChild) {
        body.append(section.firstChild);
      }

      details.append(summary, body);
      section.replaceWith(details);
    });

    const cards = Array.from(article.querySelectorAll(".legal-section"));
    const search = toolbar.querySelector("[data-legal-search]");
    const count = toolbar.querySelector("[data-legal-count]");
    const expand = toolbar.querySelector("[data-legal-expand]");
    const collapse = toolbar.querySelector("[data-legal-collapse]");

    const updateCount = () => {
      const visible = cards.filter((card) => !card.hidden).length;
      count.textContent = `${visible} section${visible === 1 ? "" : "s"}`;
    };

    const restoreDefaultState = () => {
      cards.forEach((card, index) => {
        if (!card.hidden) {
          card.open = index < initialOpen;
        }
      });
    };

    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();

      cards.forEach((card, index) => {
        const haystack = `${card.dataset.sectionTitle || ""} ${card.dataset.sectionBody || ""}`;
        const matches = !query || haystack.includes(query);
        card.hidden = !matches;

        if (matches) {
          card.open = query ? true : index < initialOpen;
        } else {
          card.open = false;
        }
      });

      updateCount();
    });

    expand.addEventListener("click", () => {
      cards.forEach((card) => {
        if (!card.hidden) {
          card.open = true;
        }
      });
    });

    collapse.addEventListener("click", () => {
      cards.forEach((card) => {
        if (!card.hidden) {
          card.open = false;
        }
      });
    });

    updateCount();
    restoreDefaultState();
  });
}

function initTableOfContents() {
  document.querySelectorAll("[data-toc-root]").forEach((root) => {
    const list = root.querySelector("[data-toc]");
    const content = root.querySelector("[data-toc-content]");

    if (!list || !content) {
      return;
    }

    list.innerHTML = "";

    const levels = list.getAttribute("data-toc-levels") || "h2";
    const customLabels = Array.from(content.querySelectorAll("[data-toc-label]"));
    const headings = customLabels.length ? customLabels : Array.from(content.querySelectorAll(levels));

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

      const level = heading.dataset.tocLevel || heading.tagName;
      if (String(level).toUpperCase() === "H3") {
        link.classList.add("toc-sub");
      }

      list.appendChild(link);
    });

    list.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }

      const target = content.querySelector(link.getAttribute("href"));
      const details = target ? target.closest("details") : null;
      if (details) {
        details.open = true;
      }
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

function openHashTarget() {
  if (!window.location.hash) {
    return;
  }

  const target = document.querySelector(window.location.hash);
  if (!target) {
    return;
  }

  const details = target.closest("details");
  if (details) {
    details.open = true;
  }

  const comicCard = target.matches(".comic-card") ? target : target.closest(".comic-card");
  if (comicCard) {
    setComicOpenState(comicCard, true);
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });
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

/*
 * Visitor behavior tracking
 * -------------------------
 * Forwards interaction events to GA4 (gtag) which the site already loads.
 * Consent Mode is configured on each page (denied by default, granted after
 * the cookie banner Accept), so gtag handles privacy automatically: while
 * consent is denied it sends cookieless pings; once granted, events get
 * associated with a user/session.
 *
 * Events sent:
 *   scroll_depth        { percent, page_path }              25/50/75/100
 *   engagement_time     { seconds, page_path }              30/60/120/300/600
 *   page_leave          { seconds, page_path }              on pagehide
 *   nav_click           { destination, label }
 *   mobile_menu_toggle  { state }                           open|close
 *   cta_click           { location, label, destination }    hero | identity
 *   release_click       { list, destination }               recent | upcoming
 *   comic_open          { comic_id, comic_title }
 *   comic_expand_all    {}
 *   comic_collapse_all  {}
 *   comic_full_image    { comic_id, comic_title }
 *   search              { search_term, page_path }
 *   legal_search        { search_term, page_path }
 *   legal_section_open  { section_title }
 *   toc_click           { section, href }
 *   external_click      { url }
 *   email_click         { address }
 *   footer_link         { destination }
 */
function initBehaviorTracking() {
  const send = (name, params) => {
    if (typeof window.gtag !== "function") {
      return;
    }
    try {
      window.gtag("event", name, Object.assign({ page_path: location.pathname }, params || {}));
    } catch (error) {
      // Swallow tracking errors; analytics must never break the page.
    }
  };

  const milestones = new Set();
  const markOnce = (key) => {
    if (milestones.has(key)) {
      return false;
    }
    milestones.add(key);
    return true;
  };

  initScrollDepth(send, markOnce);
  initEngagementTime(send, markOnce);
  initClickTracking(send);
  initSearchTracking(send);
}

function initScrollDepth(send, markOnce) {
  const targets = [25, 50, 75, 100];
  let ticking = false;

  const measure = () => {
    ticking = false;
    const doc = document.documentElement;
    const scrollable = (doc.scrollHeight || 0) - window.innerHeight;
    if (scrollable <= 0) {
      // Page fits in viewport — count it as fully viewed.
      if (markOnce("depth_100")) {
        send("scroll_depth", { percent: 100 });
      }
      return;
    }
    const percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    targets.forEach((threshold) => {
      if (percent >= threshold && markOnce(`depth_${threshold}`)) {
        send("scroll_depth", { percent: threshold });
      }
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(measure);
        ticking = true;
      }
    },
    { passive: true }
  );

  measure();
}

function initEngagementTime(send, markOnce) {
  const thresholds = [30, 60, 120, 300, 600];
  let visibleSince = document.hidden ? null : Date.now();
  let accumulated = 0;

  const elapsedSeconds = () => {
    const ongoing = visibleSince ? Date.now() - visibleSince : 0;
    return Math.round((accumulated + ongoing) / 1000);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (visibleSince) {
        accumulated += Date.now() - visibleSince;
        visibleSince = null;
      }
    } else if (!visibleSince) {
      visibleSince = Date.now();
    }
  });

  const tick = () => {
    const seconds = elapsedSeconds();
    thresholds.forEach((t) => {
      if (seconds >= t && markOnce(`engaged_${t}`)) {
        send("engagement_time", { seconds: t });
      }
    });
  };

  // Check engagement every 15s — light enough to be invisible, dense
  // enough to catch the 30s/60s thresholds promptly.
  window.setInterval(tick, 15000);

  const reportLeave = () => {
    if (markOnce("page_leave_sent")) {
      send("page_leave", { seconds: elapsedSeconds() });
    }
  };

  window.addEventListener("pagehide", reportLeave);
  window.addEventListener("beforeunload", reportLeave);
}

function initClickTracking(send) {
  // Use the capture phase so we observe element state *before* other
  // handlers (comic toggle, menu toggle) flip classes.
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const navLink = target.closest(".nav-link");
      if (navLink) {
        send("nav_click", {
          destination: navLink.getAttribute("href") || "",
          label: textOf(navLink)
        });
      }

      const menuToggle = target.closest("[data-menu-toggle]");
      if (menuToggle) {
        const nav = document.querySelector("[data-site-nav]");
        const willOpen = !nav || !nav.classList.contains("is-open");
        send("mobile_menu_toggle", { state: willOpen ? "open" : "close" });
      }

      const identityItem = target.closest(".home-identity-item");
      if (identityItem) {
        send("cta_click", {
          location: "home_identity",
          label: identityItem.getAttribute("aria-label") || "",
          destination: identityItem.getAttribute("href") || ""
        });
      }

      const ctaButton = target.closest(".hero-actions .button");
      if (ctaButton) {
        const inHomeHero = !!ctaButton.closest(".home-hero");
        send("cta_click", {
          location: inHomeHero ? "home_hero" : "page_hero",
          label: textOf(ctaButton),
          destination: ctaButton.getAttribute("href") || ""
        });
      }

      const releaseLink = target.closest(".release-link");
      if (releaseLink) {
        send("release_click", {
          list: releaseLink.classList.contains("release-link-upcoming") ? "upcoming" : "recent",
          destination: releaseLink.getAttribute("href") || "",
          label: textOf(releaseLink)
        });
      }

      const comicToggle = target.closest("[data-comic-toggle]");
      if (comicToggle) {
        const card = comicToggle.closest(".comic-card");
        // Pre-toggle state: classList is updated by the original handler later.
        if (card && !card.classList.contains("is-open")) {
          send("comic_open", {
            comic_id: card.id || "",
            comic_title: card.getAttribute("data-title") || textOf(card.querySelector(".comic-name"))
          });
        }
      }

      if (target.closest("[data-expand-all]")) {
        send("comic_expand_all", {});
      }
      if (target.closest("[data-collapse-all]")) {
        send("comic_collapse_all", {});
      }

      const fullImage = target.closest(".comic-panel-content a[target='_blank']");
      if (fullImage) {
        const card = fullImage.closest(".comic-card");
        send("comic_full_image", {
          comic_id: card ? card.id || "" : "",
          comic_title: card ? card.getAttribute("data-title") || "" : "",
          url: fullImage.getAttribute("href") || ""
        });
      }

      const legalSummary = target.closest(".legal-summary");
      if (legalSummary) {
        const details = legalSummary.closest("details");
        if (details && !details.open) {
          const titleEl = legalSummary.querySelector(".legal-summary-title");
          send("legal_section_open", { section_title: textOf(titleEl) });
        }
      }

      const tocLink = target.closest(".toc-list a");
      if (tocLink) {
        send("toc_click", {
          section: textOf(tocLink),
          href: tocLink.getAttribute("href") || ""
        });
      }

      const footerLink = target.closest(".footer-links a");
      if (footerLink) {
        send("footer_link", { destination: footerLink.getAttribute("href") || "" });
      }

      const anchor = target.closest("a[href]");
      if (anchor) {
        const href = anchor.getAttribute("href") || "";
        if (href.startsWith("mailto:")) {
          send("email_click", { address: href.replace(/^mailto:/, "") });
        } else if (/^https?:/i.test(href) && !href.startsWith(location.origin)) {
          // External link — captureOutboundLink already sends a legacy
          // "outbound" event for the PayPal CTA. This adds a structured
          // external_click event for every outbound anchor.
          send("external_click", { url: href });
        }
      }
    },
    true
  );
}

function initSearchTracking(send) {
  const watch = (input, eventName) => {
    let timer;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const query = input.value.trim();
        if (query.length >= 2) {
          send(eventName, { search_term: query });
        }
      }, 800);
    });
  };

  document.querySelectorAll("[data-comic-search]").forEach((input) => watch(input, "search"));
  document.querySelectorAll("[data-legal-search]").forEach((input) => watch(input, "legal_search"));
}

function textOf(node) {
  if (!node) {
    return "";
  }
  return (node.textContent || "").trim().replace(/\s+/g, " ");
}
