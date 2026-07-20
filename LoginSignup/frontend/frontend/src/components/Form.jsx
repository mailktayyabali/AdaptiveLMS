export default function Form(props) {
    return (
        <form className="login-form" onSubmit={props.handleSubmit}>
            <div className="input-wrapper">
                <label htmlFor="username">Username: </label>
                <input
                    onChange={props.handleUsernameInput}
                    value={props.username}
                    type="text"
                    placeholder="Username"
                    required
                />
                <br/>
                <label htmlFor="password">Password: </label>
                <input
                    onChange={props.handlePasswordInput}
                    value={props.password}
                    type="password"
                    placeholder="Password"
                    required
                />
            </div>

            <button type="submit" className="login-btn">
                {props.submitBtnText}
            </button>
        </form>
    );
}