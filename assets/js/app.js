// This prototype phase has no database connected yet, so nothing here actually saves anything.
// Every button says so plainly, rather than pretending to work.
// Once the database is set up in the next step, this file is where the real
// save/load logic will go, replacing this placeholder function.

function notConnectedYet(){
  const box = document.getElementById('statusBox');
  box.style.display = 'block';
  box.textContent = "Not connected to a database yet — this will actually save once we set that up in the next step.";
  box.scrollIntoView({behavior:'smooth', block:'center'});
}
