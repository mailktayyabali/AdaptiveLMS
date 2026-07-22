
export default function Form(props) {
    return (
        <form className="login-form" onSubmit={props.handleSubmit}>
            <div className="input-wrapper">
                <div className="field-group">
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        onChange={props.handleUsernameInput}
                        value={props.username}
                        type="text"
                        placeholder="Enter your username"
                        required
                    />
                </div>
                
                <div className="field-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        onChange={props.handlePasswordInput}
                        value={props.password}
                        type="password"
                        placeholder="Enter your password"
                        required
                    />
                </div>
            </div>

            <button type="submit" className="login-btn">
                {props.submitBtnText}
            </button>
        </form>
    );
}