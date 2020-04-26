const Tgtg = require("node-tgtg");
const Phenix = require("node-phenix");
const Optimiam = require("node-optimiam");
const Karma = require("node-karma");

class Antigaspi {
  constructor({ optimiamCreds, tgtgCreds, phenixCreds, karmaCreds }) {
    this.optimiam = new Optimiam(optimiamCreds);
    this.tgtg = new Tgtg(tgtgCreds);
    this.phenix = new Phenix(phenixCreds);
    this.karma = new Karma(karmaCreds);
  }

  async login() {
    return await Promise.all([
      this.optimiam.login(),
      this.tgtg.login(),
      this.phenix.login(),
      this.karma.login(),
    ]);
  }

  async getTgtgStores({ latitude, longitude }) {
    const products = await this.tgtg.discoverNearby(
      {
        latitude,
        longitude,
      },
      [
        "Favorites",
        "LastToday",
        "NearBy",
        "CollectNow",
        "Meals",
        "BakedGoods",
        "Groceries",
        "Recommended",
        "Breakfast",
        "Lunch",
        "Dinner",
        "TooGoodToGoStore",
        "EverythingElse",
        "Vegetarian",
        "Unlocked",
        "EssentialBags",
      ]
    );
    let itemArray = [];
    products.groupings
      .filter((product) => product.type === "DISCOVER_BUCKET")
      .map((product) => {
        const {
          discover_bucket: { items },
        } = product;
        const filteredItems = items
          .filter((bucket) => bucket.items_available > 0)
          itemArray = [...itemArray, ...filteredItems].flat(Infinity);
      })
      return itemArray.map((bucket) => {
        const { item, store, ...rest } = bucket;
        return {
          ...rest,
          ...item,
          title: `Panier surprise ${rest.display_name}`,
          price: (item.price.minor_units * 1.00)/Math.pow(10, item.price.decimals),
          value: (item.value.minor_units * 1.00)/Math.pow(10, item.value.decimals),
          store: { ...store, ...store.store_location.location },
          image_url: (store.cover_picture && store.cover_picture.current_url) ?  store.cover_picture.current_url : store.logo_picture.current_url,
          provider: "toogoodtogo",
        };
      });
    }

  async getPhenixStores({ latitude, longitude }) {
    const stores = await this.phenix.getStores(
      {
        latitude,
        longitude,
      },
      10
    );
    const items = stores.advertisers
      .map((store) => {
        const { products, ...rest } = store;
        return products.map((product) => ({
          ...product,
          store: {
            ...rest,
            store_id: store.id,
          },
          price: rest.selling_price,
          value: rest.original_price,
          provider: "phenix",
        }));
      })
      .flat(2);
    return items.filter(
      (item) => item.type_name.indexOf("product_typ_trans") === -1
    );
  }

  async getOptimiamStores({ latitude, longitude }) {
    const stores = await this.optimiam.getStores({
      latitude,
      longitude,
    });
    const storesWithDeals = stores.filter((store) => store.dealsCount > 0);
    const deals = await Promise.all(
      storesWithDeals.map(async (storewithdeal) => {
        const details = await this.optimiam.getDealsByStore(storewithdeal._id);
        const { store, ...rest } = details[0];
        return {
          ...rest,
          title: `Panier surprise ${rest.name}`,
          store: {
            ...store,
            store_id: storewithdeal._id,
            latitude: store.loc[1],
            longitude: store.loc[0]
          },
          image_url: rest.picture,
          provider: "optimiam",
        };
      })
    );
    return deals.flat(Infinity);
  }

  async getKarmaStores({ latitude, longitude }) {
    const locations = await this.karma.getLocations({
      latitude,
      longitude,
    });
    const sales = await this.karma.getSales({
      latitude,
      longitude,
    });
    const response = await Promise.all(
      sales.data.sales.map(async (sale) => {
        const properties = await this.karma
          .getSaleItemsPropertiesByLocation(sale.location_id)
          .then((response) => response.data.saleitems_properties);
        const { items, ...rest } = sale;
        return {
          ...sale,
          items: await this.karma
            .getItemsByLocation(sale.location_id)
            .then((response) =>
              response.data.items.map((item, index) => ({
                ...item,
                ...rest,
                ...properties[index],
                store: {
                  ...locations.data.locations.find(
                    (loc) => loc.id === sale.location_id
                  ),
                  store_id: sale.location_id,
                },
                provider: "karma",
              }))
            ),
        };
      })
    );
    return response.map((res) => res.items).flat(2);
  }

  async getAllDeals({ latitude, longitude }) {
    const deals = await Promise.all([
      this.getTgtgStores({ latitude, longitude }),
      this.getPhenixStores({ latitude, longitude }),
      this.getOptimiamStores({ latitude, longitude }),
      this.getKarmaStores({ latitude, longitude }),
    ])
    return deals.flat(Infinity);
  }
}

module.exports = Antigaspi;
