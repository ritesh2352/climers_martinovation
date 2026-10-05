require('dotenv').config()
const app=require('./src/app.js')
const connectToDB=require('./src/config/database')

const PORT = process.env.PORT || 3000;

connectToDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start the backend:", error.message);
    process.exitCode = 1;
  });