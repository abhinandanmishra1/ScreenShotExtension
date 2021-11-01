/*
    work flow of this extension
             firstly main function will be called
              then we will get pixels ratio after calling get zoom function in which 
              prepareCapture is passed
              preparecapture is a data stored variable.

              all I have used canvas and HIDPIcanvas to create image using Image function 

              will write remaining things asap

*/


const capturePage = cfg => {
    const createHiDPICanvas = cfg => {
      const canvas = document.createElement("canvas");
      const w = cfg.totalWidth + cfg.margins.left + cfg.margins.right;
      const h =
        cfg.totalHeight +
        cfg.margins.top +
        cfg.margins.bottom +
        cfg.titleBar.height;
      canvas.width = w * cfg.pixelRatio;
      canvas.height = h * cfg.pixelRatio;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas
        .getContext("2d")
        .setTransform(cfg.pixelRatio, 0, 0, cfg.pixelRatio, 0, 0);
      return canvas;
    };
  
    const canvas = createHiDPICanvas(cfg);
    const ctx = canvas.getContext("2d");
  
    chrome.tabs.captureVisibleTab(
      null,
      { format: "png", quality: 100 },
      dataURI => {
        if (dataURI) {
          const image = new Image();
          const titleBarImage = new Image();
          titleBarImage.onload = () => {
            addTitleBar(ctx, titleBarImage, cfg);
          };
          titleBarImage.src = cfg.titleBar.data;
          image.onload = () => {
            const coords = {
              x: cfg.margins.left,
              y: cfg.margins.top + cfg.titleBar.height,
              w: cfg.totalWidth,
              h: cfg.totalHeight
            };
            ctx.drawImage(image, coords.x, coords.y, coords.w, coords.h);
            showScreenshot(canvas, cfg);
          };
          image.src = dataURI;
        }
      }
    );
  
    const addTitleBar = (ctx, titleBarImage, cfg) => {
      const leftWidth = cfg.titleBar.leftWidth;
      const rightDx = cfg.margins.left + cfg.totalWidth - cfg.titleBar.rightWidth;
      const offset = cfg.titleBar.offset;
  
      const middleBar = {
        sx: offset,
        sy: 0,
        sw: 5,
        sh: leftWidth * 2,
        dx: cfg.margins.left + 5,
        dy: cfg.margins.top,
        dw: rightDx - cfg.margins.left,
        dh: leftWidth
      };
      const leftBar = {
        sx: 0,
        sy: 0,
        sw: offset * 2,
        sh: leftWidth * 2,
        dx: cfg.margins.left,
        dy: cfg.margins.top,
        dw: offset,
        dh: leftWidth
      };
      const rightBar = {
        sx: offset,
        sy: 0,
        sw: offset * 2,
        sh: leftWidth * 2,
        dx: rightDx,
        dy: cfg.margins.top,
        dw: offset,
        dh: leftWidth
      };
  
      addShadow(ctx, cfg);
      drawBar(ctx, titleBarImage, middleBar);
      drawBar(ctx, titleBarImage, leftBar);
      drawBar(ctx, titleBarImage, rightBar);
    };
  
    const drawBar = (ctx, image, coords) => {
      ctx.drawImage(
        image,
        coords.sx,
        coords.sy,
        coords.sw,
        coords.sh,
        coords.dx,
        coords.dy,
        coords.dw,
        coords.dh
      );
    };
  
    const addShadow = (ctx, cfg) => {
      ctx.save();
      const rect = {
        x: cfg.margins.left + cfg.shadow.edgeOffset,
        y: cfg.margins.top + cfg.shadow.edgeOffset,
        w: cfg.totalWidth - cfg.shadow.edgeOffset * 2,
        h: cfg.totalHeight + cfg.titleBar.height - cfg.shadow.edgeOffset
      };
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.shadowColor = cfg.shadow.color;
      ctx.shadowBlur = cfg.shadow.blur;
      ctx.shadowOffsetX = cfg.shadow.offsetX;
      ctx.shadowOffsetY = cfg.shadow.offsetY;
      ctx.fill();
      ctx.restore();
    };
  };
  
  const showScreenshot = (canvas, cfg) => {
    const link = document.createElement("a");
    link.download = cfg.filename;
    let dataURL = canvas.toDataURL("image/png");
    link.href = dataURL.replace("image/png", "image/octet-stream");
    const image = document.createElement("img");
    image.setAttribute("src", dataURL);
    image.setAttribute("width", 400);
    image.setAttribute("title", "Click to download");
    link.appendChild(image);
    document.body.innerText = "";
    document.body.appendChild(link);
    clearTimeout(cfg.errorTimeout);
    chrome.tabs.setZoom(cfg.tab.id, cfg.originalZoom);
  };
  
  const createFileName = () => {
    var today=new Date();
    let name = "screenshot" + "-" +today.toLocaleDateString()+"-"+today.toLocaleTimeString() + ".png";
    return name;
  };
  
  const getPixelRatio = () => {
    // simple function for getting good pixel ratio
    // although we can define it manually
    const ctx = document.createElement("canvas").getContext("2d"),
      dpr = window.devicePixelRatio || 1,
      bsr = ctx.webkitBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
    return dpr / bsr;
  };
  
  const main = () => {
    chrome.tabs.getSelected(null, tab => {
      if (tab.url.indexOf("chrome.google.com") > 0) {
        document.body.innerText =
          "No able to take screenshot"+
          "\ncheck on other websites";
        return;
      }
  
      const prepareCapture = originalZoom => {
        let errorTimeout = setTimeout(
          () => (document.body.innerText = "Failed to capture the screenshot."),
          10000
        );
        const PIXEL_RATIO = getPixelRatio();
        const cfg = {
          tab,
          errorTimeout,
          url: tab.url,
          filename: createFileName(tab.url),
          targetWidth: 1366,
          targetHeight: null,
          totalWidth: null,
          totalHeight: null,
          pixelRatio: PIXEL_RATIO,
          originalWidth: tab.width,
          originalZoom,
          margins: {
            top: 40,
            bottom: 100,
            left: 70,
            right: 70
          },
          titleBar: {
            height: 36,
            leftWidth: 120,
            rightWidth: 18,
            offset: 130,
            data:
              "data:image/png;base64"
          },
          shadow: {
            color: "rgba(0, 0, 0, 0.5)",
            blur: 50 * PIXEL_RATIO,
            offsetX: 0,
            offsetY: 20 * PIXEL_RATIO,
            edgeOffset: 3 
          }
        };
       // I have to call firstly get zoom then set zoom
        chrome.tabs.setZoom(tab.id, 1.0, () => {
          setTimeout(
            () =>
              chrome.tabs.get(tab.id, tab => {
                cfg.totalWidth = tab.width;
                cfg.totalHeight = tab.height;
                capturePage(cfg);
              }),
            50
          );
        });
      };
  
      chrome.tabs.getZoom(tab.id, prepareCapture);
    });
  };
  
main();
  