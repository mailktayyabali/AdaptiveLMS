import react from 'react'
return (
  <div className="signup">
    <h2>Signup</h2> 
    <form>
      <label htmlFor="name">Name:</label>
      <input type="text" id="name" name="name" required />
        <br />
        <label htmlFor="email">Email:</label>
        <input type="email" id="email" name="email" required />
        <br />
        <label htmlFor="password">Password:</label>
        <input type="password" id="password" name="password" required />
        <br />
        <button type="submit">Signup</button>
        <br />
        <span>Already have an account? <a href="/">Login</a></span>
    </form>
  </div>
)