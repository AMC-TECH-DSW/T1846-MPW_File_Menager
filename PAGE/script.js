const owner = "AMC-TECH-DSW";
const repo = "T1846-MPW_File_Menager";
const baseUrl = `https://${owner}.github.io/${repo}/`;

async function fetchFiles(path = "OTA/") {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url);
  const data = await res.json();

  let files = [];

  for (const item of data) {
    if (item.type === "file" && item.name.endsWith(".bin")) {
      files.push({ name: item.name, path: path + item.name });
    } else if (item.type === "dir") {
      const subFiles = await fetchFiles(path + item.name + "/");
      files = files.concat(subFiles);
    }
  }
  return files;
}

async function showFiles() {
  const list = document.getElementById("otaFileList");
  list.innerHTML = "<li>Ładowanie...</li>";

  try {
    const files = await fetchFiles();
    list.innerHTML = "";

    const images = [];
    const lcds = [];
    const controls = [];

    files.forEach(file => {
      const name = file.name.toLowerCase();
      if (name.includes("image")) {
        images.push(file);
      } else if (name.includes("softlcd")) {
        lcds.push(file);
      } else if (name.includes("softcontrol")) {
        controls.push(file);
      }
    });

    function createGroup(title, filesInGroup) {
      if (filesInGroup.length === 0) return "";

      const group = document.createElement("li");
      const header = document.createElement("div");
      header.className = "group-header";
      header.textContent = `${title} (${filesInGroup.length})`;
      header.addEventListener("click", () => {
        listDiv.classList.toggle("collapsed");
      });

      const listDiv = document.createElement("div");
      listDiv.className = "group-list";

      filesInGroup.forEach(file => {
        const a = document.createElement("a");
        a.href = baseUrl + file.path;
        a.textContent = file.path;
        a.target = "_blank";

        const item = document.createElement("div");
        item.appendChild(a);
        listDiv.appendChild(item);
      });

      group.appendChild(header);
      group.appendChild(listDiv);

      return group;
    }

    const groups = [
      createGroup("Image", images),
      createGroup("Soft LCD", lcds),
      createGroup("Soft Control", controls)
    ];

    groups.forEach(g => {
      if (g) list.appendChild(g);
    });

    if (files.length === 0) {
      list.innerHTML = "<li>Brak plików OTA w repozytorium.</li>";
    }
  } catch (error) {
    list.innerHTML = "<li>Błąd podczas ładowania plików.</li>";
    console.error(error);
  }
}

function showTab(tab) {
  document.getElementById("preparerTab").style.display = tab === 'preparer' ? 'block' : 'none';
  document.getElementById("filesTab").style.display = tab === 'files' ? 'block' : 'none';
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-button')[tab === 'preparer' ? 0 : 1].classList.add('active');
}

async function copyAllPaths() {
  const listItems = document.querySelectorAll("#otaFileList li a");
  let allLinks = "";

  listItems.forEach(link => {
    allLinks += link.href + "\n";
  });

  try {
    await navigator.clipboard.writeText(allLinks);
    alert("Skopiowano wszystkie ścieżki do schowka!");
  } catch (err) {
    alert("Błąd podczas kopiowania do schowka.");
    console.error(err);
  }
}

document.getElementById("copyPathsBtn").addEventListener("click", copyAllPaths);

showFiles();
