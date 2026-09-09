(function () {
  "use strict";

  const button = document.getElementById("download-cv");
  const cv = document.getElementById("cv-content");

  if (!button || !cv) {
    return;
  }

  let iconDataUrls = {};

  function rasterizeSymbol(symbol) {
    return new Promise(function (resolve, reject) {
      const viewBox = symbol.getAttribute("viewBox") || "0 0 24 24";
      const paths = Array.from(symbol.children)
        .map(function (child) {
          return child.outerHTML;
        })
        .join("");
      const svgMarkup =
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="' +
        viewBox +
        '" fill="#4a4a4a">' +
        paths +
        "</svg>";
      const image = new Image();

      image.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 96;
        canvas.getContext("2d").drawImage(image, 0, 0, 96, 96);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = reject;
      image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
    });
  }

  async function prepareIconDataUrls() {
    const symbols = Array.from(document.querySelectorAll("symbol[id]"));
    const renderedIcons = await Promise.all(symbols.map(rasterizeSymbol));

    iconDataUrls = symbols.reduce(function (icons, symbol, index) {
      icons[symbol.id] = renderedIcons[index];
      return icons;
    }, {});
  }

  function expandSvgUses(clonedDocument) {
    clonedDocument.querySelectorAll("svg use").forEach(function (use) {
      const reference = use.getAttribute("href") || use.getAttribute("xlink:href");

      if (!reference || reference.charAt(0) !== "#") {
        return;
      }

      const svg = use.closest("svg");
      const iconDataUrl = iconDataUrls[reference.slice(1)];

      if (!iconDataUrl || !svg) {
        return;
      }

      const image = clonedDocument.createElement("img");

      image.src = iconDataUrl;
      image.className = svg.getAttribute("class") || "icon-svg";
      image.alt = "";
      image.setAttribute("aria-hidden", "true");

      svg.replaceWith(image);
    });
  }

  button.addEventListener("click", async function () {
    const originalLabel = button.textContent;

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Generating…";

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await prepareIconDataUrls();

      await html2pdf()
        .set({
          filename: "Chen_Gao_CV.pdf",
          margin: [6, 0, 6, 0],
          html2canvas: {
            scale: 5,
            letterRendering: true,
            useCORS: true,
            onclone: expandSvgUses
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          },
          pagebreak: {
            mode: ["avoid-all"]
          }
        })
        .from(cv)
        .save();
    } catch (error) {
      console.error("CV PDF generation failed:", error);
      window.alert("The PDF could not be generated. Please try again.");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = originalLabel;
    }
  });
})();
