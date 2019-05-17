var warning = document.getElementById("warnings");
warning.addEventListener("click", function() {
    window.open("/showWarnings");
});

var error = document.getElementById("errors");
error.addEventListener("click", function() {
    window.open("/showErrors");
});