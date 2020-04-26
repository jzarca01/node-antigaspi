const Antigaspi = require("./");
const anti = new Antigaspi({
  optimiamCreds: { email: "", password: "" },
  karmaCreds: { email: "", password: "" },
  phenixCreds: { email: "", password: "" },
  tgtgCreds: { email: "", password: "" },
});

async function init() {
  await anti.login();
  const deals = await anti.getAllDeals({
    latitude: 48.97582628321333,
    longitude: 2.1714647890532685,
  });
  //console.log(JSON.stringify(deals));
  return deals;
}

init();
