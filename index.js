// Constants
const padding = { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000 };
let height = 600;
let width = 600;

// Utility function for title normalization
function normalizeTitle(title) {
  return decodeURIComponent(title)
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Drag behavior
const drag = (simulation) => {
  function dragstarted(event) {
    if (!event.active && event.dx === 0 && event.dy === 0) return;
    simulation.alphaTarget(0).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
};

// Data structures
const dataLinks = [];
const dataNodes = {};
const pageCache = {};
let linkFrom = {};

// Force simulation
let simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3
      .forceLink()
      .id((d) => d.id)
      .distance(300)
      .strength(0)
  )
  .force(
    "charge",
    d3.forceManyBody().strength(-1500).distanceMin(50).distanceMax(500)
  )
  .force("x", d3.forceX(width / 2).strength(0))
  .force("y", d3.forceY(height / 2).strength(0));

// SVG and core elements
const svg = d3.select("#svgcontainer").append("svg").style("flex-grow", "1");
let container = svg.append("g");
let node = container.selectAll(".node");
let link = container.selectAll(".link");

// Zoom setup
let currentTransform = d3.zoomIdentity;
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 4])
  .on("zoom", (event) => {
    currentTransform = event.transform;
    container.attr("transform", event.transform);
  });
svg.call(zoom);

// Global declarations
let currentPage = null;
let articleContentDiv = d3
  .select("#articleContent")
  .style("position", "relative")
  .html("");

// Resize function
function resize() {
  const containerRect = d3
    .select("#svgcontainer")
    .node()
    .getBoundingClientRect();
  width = containerRect.width;
  height = containerRect.height;
  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
  simulation
    .force("x", d3.forceX(width / 2).strength(0))
    .force("y", d3.forceY(height / 2).strength(0));
  simulation.alpha(1).restart();
}

// Button handlers for zoom and pan
const PAN_STEP = 50;
d3.select("#zoomInButton").on("click", () =>
  svg.transition().duration(250).call(zoom.scaleBy, 2)
);
d3.select("#zoomOutButton").on("click", () =>
  svg.transition().duration(250).call(zoom.scaleBy, 0.5)
);
d3.select("#resetViewButton").on("click", () =>
  svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity)
);
d3.select("#panUpButton").on("click", () =>
  svg.transition().duration(100).call(zoom.translateBy, 0, PAN_STEP)
);
d3.select("#panDownButton").on("click", () =>
  svg.transition().duration(100).call(zoom.translateBy, 0, -PAN_STEP)
);
d3.select("#panLeftButton").on("click", () =>
  svg.transition().duration(100).call(zoom.translateBy, PAN_STEP, 0)
);
d3.select("#panRightButton").on("click", () =>
  svg.transition().duration(100).call(zoom.translateBy, -PAN_STEP, 0)
);

// Resize event listener
window.addEventListener("resize", resize);

// Initialize the graph
function initialize() {
  d3.select("body")
    .append("img")
    .attr(
      "src",
      "https://en.wikipedia.org/static/images/project-logos/enwiki.png"
    )
    .style("opacity", 0)
    .style("position", "absolute")
    .style("top", "-9999px");
  let nodes = Object.values(dataNodes);
  simulation.nodes(nodes);

  simulation.force("link").links(dataLinks);

  link = container
    .selectAll(".link")
    .data(dataLinks)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);

  node = container
    .selectAll(".node")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation))
    .on("click", function (event, d) {
      event.preventDefault();
      event.stopPropagation();
      console.log("Node clicked:", d.id);
      loadWikiPage(d.id);
    });

  node
    .append("circle")
    .attr("r", 5)
    .attr("fill", "white")
    .attr("stroke", "black");

  node
    .append("text")
    .text((d) => d.id)
    .attr("dx", 10)
    .attr("dy", 3);

  node
    .on("mouseover", function (event, d) {
      d3.select(this).select("circle").attr("r", 7.5);
      d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("pointer-events", "none")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`)
        .text(d.id);
    })
    .on("mouseout", function () {
      d3.select(this).select("circle").attr("r", 5);
      d3.select(".tooltip").remove();
    });

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  resize();
}

function update() {
  let nodes = Object.values(dataNodes);
  simulation.nodes(nodes);
  simulation.force("link").links(dataLinks);

  link = container
    .selectAll(".link")
    .data(dataLinks)
    .join("line")
    .attr("class", "link")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);

  node = container
    .selectAll(".node")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation))
    .on("click", function (event, d) {
      event.preventDefault();
      event.stopPropagation();
      console.log("Node clicked:", d.id);
      loadWikiPage(d.id);
    });

  node.selectAll("*").remove();
  node
    .append("circle")
    .attr("r", 5)
    .attr("fill", "white")
    .attr("stroke", "black");
  node
    .append("text")
    .text((d) => d.id)
    .attr("dx", 10)
    .attr("dy", 3);

  node
    .on("mouseover", function (event, d) {
      d3.select(this).select("circle").attr("r", 7.5);
      d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("pointer-events", "none")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`)
        .text(d.id);
    })
    .on("mouseout", function () {
      d3.select(this).select("circle").attr("r", 5);
      d3.select(".tooltip").remove();
    });

  simulation.alpha(1).restart();
  updateLink();
}

function addLink(source, target, linkId) {
  if (
    !dataLinks.some(
      (link) => link.source.id === source && link.target.id === target
    )
  ) {
    dataLinks.push({ source, target, linkId });
  }
  return true;
}

function nodeColor(highlightTitel) {
  node
    .select("text")
    .attr("fill", (d) => (d.id === highlightTitel ? "green" : "black"));
}

function updateLink() {
  d3.select("#shareA").attr(
    "href",
    `${location.origin}${location.pathname}?pageids=${Object.values(dataNodes)
      .filter((d) => d.pageid && d.pageid !== -1)
      .map((d) => d.pageid)
      .join("|")}`
  );
}

function loadWikiPage(titel, scrollTo, eraseforwardStack = true) {
  titel = normalizeTitle(titel);
  console.log("loadWikiPage called with:", titel);

  if (pageCache[titel]) {
    displayCachedPage(titel, scrollTo, eraseforwardStack);
    return;
  }

  let pr = null;

  if (!(titel in dataNodes)) {
    pr = Promise.all([
      d3.json(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(
          titel
        )}&prop=info`
      ),
      d3.html(
        `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(
          titel
        )}`
      ),
    ])
      .then(function ([infoData, htmlData]) {
        const page = Object.values(infoData.query.pages)[0];
        const pageid = page.pageid;

        if (currentPage && currentPage !== articleContentDiv)
          currentPage.style("display", "none");
        currentPage = articleContentDiv;

        currentPage.html("");
        currentPage.style("display", "block");

        try {
          currentPage.node().append(htmlData.documentElement);
        } catch (error) {
          console.error("Error appending content:", error);
          currentPage.html("<p>Error loading page content</p>");
        }

        const firstH2 = currentPage.select("h2").node();
        if (firstH2) {
          let sibling = firstH2.nextSibling;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE) {
              d3.select(sibling).style("display", "none");
            }
            sibling = sibling.nextSibling;
          }
          d3.select(firstH2).style("display", "none");
        }

        currentPage
          .append("button")
          .text("Expand full article")
          .style("margin", "10px 0")
          .style("padding", "5px 10px")
          .style("background-color", "#007bff")
          .style("color", "white")
          .style("border", "none")
          .style("border-radius", "4px")
          .style("cursor", "pointer")
          .on("click", function () {
            currentPage.selectAll("*").style("display", null);
            d3.select(this).remove();
          });

        currentPage
          .insert("h1", ":first-child")
          .style("font-size", "28.8px")
          .style("margin-top", "0px")
          .style("margin-bottom", "15px")
          .style("color", "#222")
          .attr("class", "firstHeading")
          .attr("id", "firstHeading")
          .html(titel);

        pageCache[titel] = {
          content: currentPage.html(),
          pageid: pageid,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(
            titel.replace(/ /g, "_")
          )}`,
        };

        currentPage.selectAll("a").each(function () {
          const link = d3.select(this);
          let href = link.attr("href");
          if (!href) return;

          const match = href.match(
            /^(?:(?:https?:\/\/en\.wikipedia\.org)?\/wiki\/|\.?\/?)([^#]+)(?:#(.*))?/
          );

          if (match) {
            const fullTitle = normalizeTitle(match[1]);
            const section = match[2] || undefined;

            link.on("click", null);
            link
              .attr("href", "javascript:void(0);")
              .on("click", function (event) {
                event.preventDefault();
                loadWikiPage(fullTitle, section);
              });

            if (fullTitle !== titel) {
              const linkId = validId(`${titel}_${fullTitle}`);

              linkFrom[fullTitle] = linkFrom[fullTitle] || {};
              if (!linkFrom[fullTitle][titel]) {
                linkFrom[fullTitle][titel] = linkId;
                link.attr("id", linkId);
              }

              if (dataNodes[fullTitle]) {
                addLink(titel, fullTitle);
              }
            }
          } else {
            link.attr("target", "_blank");
          }
        });

        if (simulation != null) simulation.stop();
        dataNodes[titel] = {
          id: titel,
          pageid: pageid,
          url: pageCache[titel].url,
          x: width * Math.random(),
          y: height * Math.random(),
        };

        updateLink();

        Object.keys(dataNodes).forEach((e) => {
          if (e in linkFrom) {
            Object.entries(linkFrom[e]).forEach(([source, id]) =>
              addLink(source, e, id)
            );
          }
        });
        update();
      })
      .catch(function (error) {
        console.error(`Error loading page ${titel}:`, error);
        articleContentDiv.html(
          "<p>Sorry, there was an error loading this page.</p>"
        );
      });
  } else {
    pr = Promise.resolve().then(function () {
      let newPage = d3.select(`#${validId(titel)}`);
      if (newPage.empty()) return;
      if (currentPage && currentPage !== articleContentDiv)
        currentPage.style("display", "none");
      currentPage = articleContentDiv;
      currentPage.html(pageCache[titel].content);
      currentPage.style("display", "block");

      currentPage.selectAll("a").each(function () {
        let link = d3.select(this);
        let href = link.attr("href");
        if (!href) return;

        if (href.startsWith("javascript:loadWikiPage")) {
          link
            .attr("href", "javascript:void(0);")
            .on("click", function (event) {
              event.preventDefault();
              let match = href.match(
                /loadWikiPage$$`([^`]+)`(?:,\s*`([^`]+)`)?/
              );
              if (match) {
                loadWikiPage(match[1], match[2]);
              }
            });
        }
      });
    });
  }

  pr.then(function () {
    if (currentPage) {
      currentPage
        .selectAll(".highlight-yellow")
        .classed("highlight-yellow", false);
      nodeColor(titel);
      d3.select("#openInWikipediaA").attr(
        "href",
        `./${encodeURIComponent(titel.replace(/ /g, "_"))}`
      );
      backStack.push([titel, scrollTo]);
      backButton.property("disabled", backStack.length < 2);
      deleteButton.property("disabled", false);

      if (eraseforwardStack) {
        forwardStack = [];
        forwardButton.property("disabled", true);
      }

      if (typeof scrollTo !== "undefined") {
        try {
          currentPage
            .select(`#${scrollTo}`)
            .classed("highlight-yellow", true)
            .node()
            .scrollIntoView();
        } catch (e) {
          console.warn(`Could not scroll to section ${scrollTo}:`, e);
          currentPage.node().scrollTop = 0;
        }
      } else {
        currentPage.node().scrollTop = 0;
      }

      searchButtonClick(false);
    }
  }).catch(function (error) {
    console.error(`Error in post-processing for ${titel}:`, error);
  });
}

function displayCachedPage(titel, scrollTo, eraseforwardStack) {
  const cachedPage = pageCache[titel];
  if (currentPage && currentPage !== articleContentDiv)
    currentPage.style("display", "none");
  currentPage = articleContentDiv;
  currentPage.html(cachedPage.content);
  currentPage.style("display", "block");

  currentPage.selectAll("a").each(function () {
    let link = d3.select(this);
    let href = link.attr("href");

    if (href && href.startsWith("javascript:loadWikiPage")) {
      link
        .on("click", null)
        .attr("href", "javascript:void(0);")
        .on("click", function (event) {
          event.preventDefault();
          let match = href.match(/loadWikiPage$$`([^`]+)`(?:,\s*`([^`]+)`)?/);
          if (match) {
            loadWikiPage(normalizeTitle(match[1]), match[2]);
          }
        });
    }
  });

  nodeColor(titel);
  d3.select("#openInWikipediaA").attr("href", cachedPage.url);

  backStack.push([titel, scrollTo]);
  backButton.property("disabled", backStack.length < 2);
  deleteButton.property("disabled", false);

  if (eraseforwardStack) {
    forwardStack = [];
    forwardButton.property("disabled", true);
  }

  if (typeof scrollTo !== "undefined") {
    try {
      currentPage
        .select(`#${scrollTo}`)
        .classed("highlight-yellow", true)
        .node()
        .scrollIntoView();
    } catch (e) {
      console.warn(`Could not scroll to section ${scrollTo}:`, e);
      currentPage.node().scrollTop = 0;
    }
  } else {
    currentPage.node().scrollTop = 0;
  }

  searchButtonClick(false);

  if (!(titel in dataNodes)) {
    if (simulation != null) simulation.stop();
    dataNodes[titel] = {
      id: titel,
      pageid: cachedPage.pageid,
      url: cachedPage.url,
      x: width * Math.random(),
      y: height * Math.random(),
    };

    updateLink();

    Object.keys(dataNodes).forEach((e) => {
      if (e in linkFrom) {
        Object.entries(linkFrom[e]).forEach(([source, id]) =>
          addLink(source, e, id)
        );
      }
    });
    update();
  }
}

let params = new URLSearchParams(location.search);
let pr = null;
if (params.has("pageids")) {
  pr = d3
    .json(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&pageids=${params.get(
        "pageids"
      )}`
    )
    .then((data) => Object.values(data.query.pages).map((d) => d.title));
} else if (params.has("pages")) {
  pr = Promise.resolve().then(() => params.get("pages").split("|"));
}

if (pr != null) {
  pr.then((initPages) => initPages.forEach((p) => loadWikiPage(p)));
}

function titelOnInput(e) {
  let searchString = e.target.value;
  let pr = null;

  if (searchString === "") {
    pr = Promise.resolve().then(() => pagesFeed);
  } else {
    pr = d3
      .json(
        `https://en.wikipedia.org/w/api.php?action=opensearch&origin=*&limit=10&search=${encodeURIComponent(
          searchString
        )}`
      )
      .then((data) => data[1]);
  }

  pr.then(function (data) {
    let suggestions = d3.select("#suggestions");
    suggestions.html("");
    data.forEach((searchRes) => {
      suggestions
        .append("div")
        .attr("class", "suggestion")
        .html(searchRes)
        .on("click", () => loadWikiPage(searchRes));
    });
  });
}

d3.select("#inputTitel").on("input", titelOnInput);

const today = new Date(new Date().toUTCString());
const dd = String(today.getUTCDate()).padStart(2, "0");
const mm = String(today.getMonth() + 1).padStart(2, "0");
const yyyy = today.getFullYear();

let pagesFeed = null;
d3.json(
  `https://en.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`
)
  .then((data) => {
    let mostread =
      "mostread" in data
        ? data.mostread.articles.map((d) => d.normalizedtitle)
        : [];
    let news =
      "news" in data ? data.news.map((d) => d.links[0].normalizedtitle) : [];
    let onthisday =
      "onthisday" in data
        ? data.onthisday.map((d) => d.pages[0].normalizedtitle)
        : [];

    pagesFeed = [data.tfa.normalizedtitle];
    let mostreadNum = Math.min(4, mostread.length);
    Array.prototype.push.apply(pagesFeed, mostread.slice(0, mostreadNum));
    let newsNum = Math.min(2, news.length);
    Array.prototype.push.apply(pagesFeed, news.slice(0, newsNum));
    let onthisdayNum = Math.min(3, onthisday.length);
    Array.prototype.push.apply(pagesFeed, onthisday.slice(0, onthisdayNum));
    Array.prototype.push.apply(
      pagesFeed,
      mostread.slice(mostreadNum, mostreadNum + 10 - pagesFeed.length)
    );
  })
  .then(() => titelOnInput({ target: { value: "" } }));

d3.select("#randmArticle").on("click", () => {
  d3.json(`https://en.wikipedia.org/api/rest_v1/page/random/title`).then(
    (data) => loadWikiPage(data.items[0].title)
  );
});

let backStack = [];
let forwardStack = [];

const backButton = d3.select("#backButton");
const forwardButton = d3.select("#forwardButton");
const deleteButton = d3.select("#deleteButton");

backButton.on("click", () => {
  if (backStack.length > 1) {
    forwardStack.push(backStack.pop());
    const page = backStack.pop();
    loadWikiPage(page[0], page[1], false);
    forwardButton.property("disabled", false);
  }
});

forwardButton.on("click", () => {
  if (forwardStack.length > 0) {
    const page = forwardStack.pop();
    loadWikiPage(page[0], page[1], false);
    forwardButton.property("disabled", forwardStack.length === 0);
  }
});

deleteButton.on("click", () => {
  if (backStack.length > 0) {
    const titel = backStack.pop()[0];
    delete dataNodes[titel];
    if (currentPage) {
      currentPage.html("");
      currentPage.style("display", "none");
    }

    dataLinks = dataLinks.filter(
      (link) => link.source.id !== titel && link.target.id !== titel
    );

    const len = backStack.length;
    if (len > 0) {
      const page = backStack.pop();
      loadWikiPage(page[0], page[1], false);
    } else {
      deleteButton.property("disabled", true);
    }
    backButton.property("disabled", len <= 1);

    updateLink();
    update();
  }
});

function changePage(oldPage, newPage) {
  if (oldPage) oldPage.style("display", "none");
  newPage.style("display", "block");
}

function validId(titel) {
  return titel
    .replace(/ /g, "_")
    .replace(/[^a-zA-Z0-9_]/g, (m) => m.charCodeAt(0).toString(16))
    .replace(/^(\d)/, "id$1");
}

// This function should be defined based on your specific implementation
function searchButtonClick(showSearch) {
  // Implement the logic for showing/hiding search and article views
}

// Start the application
initialize();

// You might want to add any additional event listeners or initializations here

// For example, you could add a window load event to ensure everything is set up properly
window.addEventListener("load", () => {
  // Any additional setup that needs to happen after the page is fully loaded
  console.log("Wikipedia Graph application loaded");
});
