export class Game {
    constructor({ id, name, description, price, release_date, categories, category, developer, image }) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = typeof price === 'number' ? price : parseFloat(price) || 0;
        this.release_date = release_date;
        this.categories = categories || category || [];
        this.developer = developer;
        this.image = image;
    }
}