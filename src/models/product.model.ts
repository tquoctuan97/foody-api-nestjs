export class Product {
  id: string;
  title: string;
  price: number;

  constructor(id: string, title: string, price: number) {
    if (id !== null) this.id = id;
    this.title = title;
    this.price = price;
  }
}
